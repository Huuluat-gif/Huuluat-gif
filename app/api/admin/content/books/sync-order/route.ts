import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json, assertSameOrigin, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const categoryEnum = z.enum([
  'marketing', 'kinhte', 'kynang', 'tamly', 'phapluat', 'ngoaingu',
  'lichsu', 'khoahoc', 'vanhocvn', 'vanhocqt', 'tieuthuyet', 'tamlinh',
  'trinhtham', 'dacbiet',
]);
const syncOrderSchema = z.object({
  order: z.array(z.object({
    id: z.string().min(1).max(80),
    sortOrder: z.number().int().min(0).max(999999),
    category: categoryEnum.optional(),
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

  // Bulk update sortOrder (and normalized category if provided) for existing books in one SQL round-trip
  if (body.order.length) {
    const ids = body.order.map((o) => o.id);
    const orders = body.order.map((o) => o.sortOrder);
    const categories = body.order.map((o) => o.category || '');
    const rows = await sql`
      UPDATE lowf_content AS c
      SET data = CASE
            WHEN v.cat <> '' THEN jsonb_set(jsonb_set(c.data, '{sortOrder}', to_jsonb(v.ord), true), '{category}', to_jsonb(v.cat), true)
            ELSE jsonb_set(c.data, '{sortOrder}', to_jsonb(v.ord), true)
          END,
          status = 'published',
          updated_at = now()
      FROM (
        SELECT * FROM unnest(${ids}::text[], ${orders}::int[], ${categories}::text[]) AS t(id, ord, cat)
      ) AS v
      WHERE c.kind = 'books' AND c.id = v.id
      RETURNING c.id
    `;
    updatedCount = rows.length;
  }

  // Optionally archive published books outside the curated keepIds list (e.g. trimmed fantasy novels)
  if (body.archiveOthers && body.keepIds && body.keepIds.length) {
    const archived = await sql`
      UPDATE lowf_content
      SET status = 'archived',
          data = jsonb_set(data, '{status}', '"archived"', true),
          updated_at = now()
      WHERE kind = 'books'
        AND status = 'published'
        AND NOT (id = ANY(${body.keepIds}::text[]))
      RETURNING id
    `;
    archivedCount = archived.length;
  }

  return json({ updatedCount, archivedCount });
});
