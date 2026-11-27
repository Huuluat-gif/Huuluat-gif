import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json, assertSameOrigin, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { CURATED_BOOKS } from '@/lib/curated-books';

const LEGACY_SAMPLE_IDS = [
  'slow',
  'peace',
  'life',
  'garden',
  'money',
  'clear',
  'atlas',
  'combo',
  ...CURATED_BOOKS.map((b) => b.id),
];

const payloadSchema = z
  .object({
    includeShortText: z.boolean().optional(),
    minChars: z.number().int().min(3000).max(120000).optional(),
  })
  .optional();

type CleanupBody = { includeShortText?: boolean; minChars?: number };

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`admin:${user.id}`, 30, 60);
  const body: CleanupBody = (await parseBody(request, payloadSchema).catch(() => ({} as CleanupBody))) ?? {};
  const includeShortText = body.includeShortText !== false;
  const minChars = body.minChars ?? 30000; // ~20 paperback pages (~1,500 chars/page)
  const sql = getSQL();

  const archivedIds = new Set<string>();

  // 1. Archive all 24 legacy demo & curated sample books
  const sampleRows = await sql`
    UPDATE lowf_content
    SET status = 'archived',
        data = jsonb_set(data, '{status}', '"archived"'),
        updated_at = now()
    WHERE kind = 'books'
      AND status != 'archived'
      AND id = ANY(${LEGACY_SAMPLE_IDS}::text[])
    RETURNING id
  `;
  for (const row of sampleRows) archivedIds.add(String(row.id));

  // 2. Optionally archive text-only books shorter than 20 estimated pages
  if (includeShortText) {
    const candidates = await sql`
      SELECT id, data->'chapters' AS chapters
      FROM lowf_content
      WHERE kind = 'books'
        AND status != 'archived'
        AND COALESCE(data->>'pdfAssetId', '') = ''
    `;
    const shortIds: string[] = [];
    for (const row of candidates) {
      const chapters = Array.isArray(row.chapters) ? row.chapters : [];
      let totalChars = 0;
      for (const ch of chapters) {
        const paras = Array.isArray(ch?.paragraphs) ? ch.paragraphs : [];
        for (const p of paras) totalChars += String(p || '').length;
      }
      if (totalChars < minChars) {
        shortIds.push(String(row.id));
      }
    }
    if (shortIds.length) {
      const shortRows = await sql`
        UPDATE lowf_content
        SET status = 'archived',
            data = jsonb_set(data, '{status}', '"archived"'),
            updated_at = now()
        WHERE kind = 'books'
          AND id = ANY(${shortIds}::text[])
        RETURNING id
      `;
      for (const row of shortRows) archivedIds.add(String(row.id));
    }
  }

  return json({
    archivedCount: archivedIds.size,
    archivedIds: [...archivedIds],
  });
});
