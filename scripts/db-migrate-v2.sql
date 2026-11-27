-- Lowf Library Schema Upgrade v2 (Safe Idempotent Migration for Neon PostgreSQL)
-- Supports full editorial lifecycle, 100k-book indexed search, SHA-256 deduplication,
-- copyright audit tracking, and admin activity logs without modifying existing data.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Expand allowed editorial lifecycle statuses on lowf_content
ALTER TABLE lowf_content DROP CONSTRAINT IF EXISTS lowf_content_status_check;
ALTER TABLE lowf_content
  ADD CONSTRAINT lowf_content_status_check
  CHECK (status IN ('draft', 'processing', 'needs_review', 'ready', 'published', 'archived', 'failed'));

-- 2. Add optional checksum & backend tracking to lowf_assets
ALTER TABLE lowf_assets ADD COLUMN IF NOT EXISTS sha256 text;
ALTER TABLE lowf_assets ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'vercel-blob';
UPDATE lowf_assets
  SET storage_backend = 'r2'
  WHERE storage_backend = 'vercel-blob'
    AND (pathname LIKE 'r2/%' OR pathname LIKE 'books/%' OR pathname LIKE 'covers/%' OR pathname LIKE 'assets/%');

CREATE INDEX IF NOT EXISTS lowf_assets_sha256_idx ON lowf_assets(sha256) WHERE sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS lowf_assets_backend_kind_idx ON lowf_assets(storage_backend, kind);

-- 3. High-scale book search & ordering indexes (supports 1k -> 100k books)
CREATE INDEX IF NOT EXISTS lowf_content_books_sort_idx
  ON lowf_content (
    (CASE WHEN (data->>'sortOrder') ~ '^[0-9]+$' THEN (data->>'sortOrder')::int ELSE 999999 END),
    created_at,
    id
  )
  WHERE kind = 'books' AND status = 'published';

CREATE INDEX IF NOT EXISTS lowf_content_books_cat_status_idx
  ON lowf_content ((data->>'category'), status)
  WHERE kind = 'books';

CREATE INDEX IF NOT EXISTS lowf_content_books_title_trgm_idx
  ON lowf_content USING gin (lower(COALESCE(data->>'title', '')) gin_trgm_ops)
  WHERE kind = 'books';

CREATE INDEX IF NOT EXISTS lowf_content_books_author_trgm_idx
  ON lowf_content USING gin (lower(COALESCE(data->>'author', '')) gin_trgm_ops)
  WHERE kind = 'books';

CREATE INDEX IF NOT EXISTS lowf_content_books_isbn_idx
  ON lowf_content ((data->>'isbn'))
  WHERE kind = 'books' AND COALESCE(data->>'isbn', '') <> '';

CREATE INDEX IF NOT EXISTS lowf_content_books_checksum_idx
  ON lowf_content ((data->>'checksumSha256'))
  WHERE kind = 'books' AND COALESCE(data->>'checksumSha256', '') <> '';

-- 4. Admin audit & import activity log
CREATE TABLE IF NOT EXISTS lowf_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  action text NOT NULL,
  target_kind text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lowf_admin_audit_created_idx ON lowf_admin_audit_log(created_at DESC);
