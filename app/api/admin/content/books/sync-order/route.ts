import { z } from 'zod';
import { del } from '@vercel/blob';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json, assertSameOrigin, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { blobCredentials } from '@/lib/blob-config';
import { isR2Configured, isR2Path, r2DeleteObjects } from '@/lib/r2';

export const dynamic = 'force-dynamic';
const categoryEnum = z.enum([
  'marketing', 'kinhte', 'kynang', 'tamly', 'phapluat', 'ngoaingu',
  'lichsu', 'khoahoc', 'vanhocvn', 'vanhocqt', 'tieuthuyet', 'truyentranh', 'tamlinh',
  'trinhtham', 'dacbiet',
]);
const syncOrderSchema = z.object({
  order: z.array(z.object({
    id: z.string().min(1).max(80),
    sortOrder: z.number().int().min(0).max(999999),
    category: categoryEnum.optional(),
    status: z.enum(['published', 'draft']).optional(),
  })).max(2000),
  archiveOthers: z.boolean().optional(),
  keepIds: z.array(z.string().min(1).max(80)).max(2000).optional(),
});

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`admin-order:${user.id}`, 60, 60);
  const body = await parseBody(request, syncOrderSchema, 1024 * 1024);
  const sql = getSQL();

  let updatedCount = 0;
  let archivedCount = 0;
  let freedAssets = 0;
  let freedBytes = 0;
  const updatedIds: string[] = [];

  const r2Active = isR2Configured();

  // Bulk update sortOrder, normalized category, and published/draft status for intact existing books in one SQL round-trip
  if (body.order.length) {
    const ids = body.order.map((o) => o.id);
    const orders = body.order.map((o) => o.sortOrder);
    const categories = body.order.map((o) => o.category || '');
    const statuses = body.order.map((o) => o.status || 'published');
    const rows = await sql`
      UPDATE lowf_content AS c
      SET data = jsonb_set(
            CASE
              WHEN v.cat <> '' THEN jsonb_set(jsonb_set(c.data, '{sortOrder}', to_jsonb(v.ord), true), '{category}', to_jsonb(v.cat), true)
              ELSE jsonb_set(c.data, '{sortOrder}', to_jsonb(v.ord), true)
            END,
            '{status}',
            to_jsonb(v.st),
            true
          ),
          status = v.st,
          updated_at = now()
      FROM (
        SELECT * FROM unnest(${ids}::text[], ${orders}::int[], ${categories}::text[], ${statuses}::text[]) AS t(id, ord, cat, st)
      ) AS v
      WHERE c.kind = 'books'
        AND c.id = v.id
        AND (COALESCE(c.data->>'pdfAssetId', '') <> '' OR jsonb_array_length(COALESCE(c.data->'chapters', '[]'::jsonb)) > 0)
      RETURNING c.id,
        COALESCE(c.data->>'coverAssetId', '') AS cover_id,
        COALESCE(c.data->>'pdfAssetId', '') AS pdf_id
    `;
    updatedCount = rows.length;
    if (r2Active) {
      // Only mark an existing book as already migrated when any referenced cover/pdf asset already lives on R2
      const r2Rows = await sql`
        SELECT id::text AS id FROM lowf_assets WHERE pathname LIKE 'r2/%'
      `;
      const r2AssetIds = new Set(r2Rows.map((r) => String(r.id)));
      for (const r of rows) {
        const covId = String(r.cover_id || '');
        const pdfId = String(r.pdf_id || '');
        const covOk = !covId || r2AssetIds.has(covId);
        const pdfOk = !pdfId || r2AssetIds.has(pdfId);
        if (covOk && pdfOk) updatedIds.push(String(r.id));
      }
    } else {
      for (const r of rows) updatedIds.push(String(r.id));
    }
  }

  // Optionally archive published/draft books outside the curated keepIds list and reclaim their orphaned Blob storage
  if (body.archiveOthers && body.keepIds && body.keepIds.length) {
    const archived = await sql`
      UPDATE lowf_content
      SET status = 'archived',
          data = jsonb_set(data, '{status}', '"archived"', true),
          updated_at = now()
      WHERE kind = 'books'
        AND status IN ('published', 'draft')
        AND NOT (id = ANY(${body.keepIds}::text[]))
      RETURNING id
    `;
    archivedCount = archived.length;

    try {
      const orphans = await sql`
        SELECT a.id, a.pathname, a.byte_size
        FROM lowf_assets a
        WHERE a.kind IN ('pdf', 'image')
          AND EXISTS (
            SELECT 1 FROM lowf_content c
            WHERE c.kind = 'books' AND c.status = 'archived'
              AND (c.data->>'coverAssetId' = a.id::text OR c.data->>'pdfAssetId' = a.id::text)
          )
          AND NOT EXISTS (
            SELECT 1 FROM lowf_content c
            WHERE c.status IN ('published', 'draft')
              AND (c.data->>'coverAssetId' = a.id::text OR c.data->>'pdfAssetId' = a.id::text OR c.data->>'assetId' = a.id::text)
          )
          AND NOT EXISTS (
            SELECT 1 FROM lowf_design_versions d
            WHERE d.settings::text LIKE '%' || a.id::text || '%'
          )
        LIMIT 800
      `;
      if (orphans.length) {
        const r2Orphans = orphans.filter((o) => isR2Path(String(o.pathname)));
        const blobOrphans = orphans.filter((o) => !isR2Path(String(o.pathname)));
        const orphanIds: string[] = [];
        if (r2Orphans.length && r2Active) {
          await r2DeleteObjects(r2Orphans.map((o) => String(o.pathname)));
          for (const o of r2Orphans) {
            orphanIds.push(String(o.id));
            freedBytes += Number(o.byte_size || 0);
          }
        }
        if (blobOrphans.length && !r2Active) {
          const creds = blobCredentials();
          for (let i = 0; i < blobOrphans.length; i += 100) {
            const batch = blobOrphans.slice(i, i + 100);
            await del(batch.map((o) => String(o.pathname)), creds);
            for (const o of batch) {
              orphanIds.push(String(o.id));
              freedBytes += Number(o.byte_size || 0);
            }
          }
        }
        if (orphanIds.length) {
          await sql`
            UPDATE lowf_content
            SET data = (data - 'coverAssetId') - 'pdfAssetId'
            WHERE kind = 'books' AND status = 'archived'
              AND (data->>'coverAssetId' = ANY(${orphanIds}::text[]) OR data->>'pdfAssetId' = ANY(${orphanIds}::text[]))
          `;
          await sql`DELETE FROM lowf_assets WHERE id::text = ANY(${orphanIds}::text[])`;
          freedAssets = orphanIds.length;
        }
      }
    } catch {
      // Non-fatal: archived rows remain hidden even if Blob cleanup hits a transient error
    }
  }

  return json({
    storageBackend: r2Active ? 'r2' : 'vercel-blob',
    updatedCount,
    updatedIds,
    archivedCount,
    freedAssets,
    freedMb: Math.round((freedBytes / 1048576) * 10) / 10,
  });
});
