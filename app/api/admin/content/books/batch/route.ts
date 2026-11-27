import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json, assertSameOrigin, parseBody, HttpError } from '@/lib/api';
import { normalizeItem, validateAssets, adminItem } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const batchSchema = z.object({
  books: z.array(z.record(z.string(), z.unknown())).min(1).max(30),
});

let statusConstraintEnsured: Promise<void> | null = null;
function ensureExpandedStatusConstraint(): Promise<void> {
  if (!statusConstraintEnsured) {
    statusConstraintEnsured = (async () => {
      try {
        const sql = getSQL();
        await sql`
          DO $$
          DECLARE
            c record;
          BEGIN
            FOR c IN
              SELECT conname
              FROM pg_constraint
              WHERE conrelid = 'lowf_content'::regclass
                AND contype = 'c'
                AND pg_get_constraintdef(oid) LIKE '%status%'
                AND pg_get_constraintdef(oid) NOT LIKE '%needs_review%'
            LOOP
              EXECUTE format('ALTER TABLE lowf_content DROP CONSTRAINT IF EXISTS %I', c.conname);
            END LOOP;
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conrelid = 'lowf_content'::regclass
                AND conname = 'lowf_content_status_check'
                AND pg_get_constraintdef(oid) LIKE '%needs_review%'
            ) THEN
              ALTER TABLE lowf_content
                ADD CONSTRAINT lowf_content_status_check
                CHECK (status IN ('draft','processing','needs_review','ready','published','archived','failed'));
            END IF;
          END $$;
        `;
      } catch {
        // Non-fatal if DB user lacks DDL privilege or constraint already expanded
      }
    })();
  }
  return statusConstraintEnsured;
}

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`admin-batch:${user.id}`, 600, 60);
  await ensureExpandedStatusConstraint();

  const body = await parseBody(request, batchSchema, 4 * 1024 * 1024);
  const sql = getSQL();
  const saved: Record<string, unknown>[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const raw of body.books) {
    const candidateId = typeof raw.id === 'string' ? raw.id : '';
    try {
      const preserveChapters = raw.preserveChapters === true;
      const cleanRaw = { ...raw };
      delete cleanRaw.preserveChapters;
      if (!cleanRaw.id) delete cleanRaw.id;
      const item = normalizeItem('books', cleanRaw);
      const id = String(item.id || randomUUID());
      item.id = id;

      if (preserveChapters && !item.chapters) {
        // Validate uploaded R2 assets cleanly while allowing existing chapters stored in Neon DB to satisfy publish check
        await validateAssets('books', { ...item, status: 'draft' }, user.id);
        const patched = await sql`
          UPDATE lowf_content
          SET data = (CASE WHEN data ? 'chapters' THEN jsonb_build_object('chapters', data->'chapters') ELSE '{}'::jsonb END) || ${JSON.stringify(item)}::jsonb,
              status = ${String(item.status)},
              updated_at = now()
          WHERE kind = 'books' AND id = ${id} AND data ? 'chapters'
          RETURNING id
        `;
        if (patched.length) {
          saved.push(adminItem(item));
          continue;
        }
      }

      await validateAssets('books', item, user.id);

      await sql`
        INSERT INTO lowf_content(kind, id, data, status)
        VALUES('books', ${id}, ${JSON.stringify(item)}::jsonb, ${String(item.status)})
        ON CONFLICT(kind, id) DO UPDATE
          SET data = EXCLUDED.data,
              status = EXCLUDED.status,
              updated_at = now()
      `;
      saved.push(adminItem(item));
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : 'Không thể lưu sách.';
      failed.push({ id: candidateId || '(no-id)', error: message });
    }
  }

  return json({ saved, failed }, saved.length ? 200 : 400);
});
