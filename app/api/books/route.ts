import { getSQL } from '@/lib/db';
import { getUser } from '@/lib/auth/server';
import { json, route } from '@/lib/api';
import { hasMembership } from '@/lib/membership';
import { publicItem } from '@/lib/content';
import { getPurchasedBookIds } from '@/lib/commerce';

export const dynamic = 'force-dynamic';

function normVN(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Scalable paginated & Vietnamese diacritic-insensitive catalog search API.
 * Designed to scale from 500 to 100,000+ books without shipping the full list on boot.
 */
export const GET = route(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const qRaw = (params.get('q') || '').trim().slice(0, 120);
  const category = (params.get('category') || 'all').trim();
  const language = (params.get('language') || 'all').trim();
  const format = (params.get('format') || 'all').trim();
  const sort = (params.get('sort') || 'featured').trim();
  const limit = Math.max(1, Math.min(60, Number(params.get('limit') || 24) || 24));
  const offset = Math.max(0, Math.min(100_000, Number(params.get('cursor') || params.get('offset') || 0) || 0));

  const sql = getSQL();
  const user = await getUser();
  const [entitled, purchases] = await Promise.all([
    user ? (user.isAdmin ? Promise.resolve(true) : hasMembership(user.id)) : Promise.resolve(false),
    user ? getPurchasedBookIds(user.id) : Promise.resolve([]),
  ]);
  const bought = new Set(purchases);

  const rows = await sql`
    SELECT kind, id, data - 'chapters' AS data, status,
      jsonb_array_length(COALESCE(data->'chapters', '[]'::jsonb)) AS chapter_count
    FROM lowf_content
    WHERE kind = 'books'
      AND status = 'published'
      AND (${category} = 'all' OR data->>'category' = ${category})
      AND (${language} = 'all' OR COALESCE(data->>'language', 'vi') = ${language})
      AND (
        ${format} = 'all'
        OR (${format} = 'pdf' AND COALESCE(data->>'pdfAssetId', '') <> '')
        OR (${format} = 'epub' AND COALESCE(data->>'pdfAssetId', '') = '')
        OR (${format} = 'print' AND data->>'format' IN ('Sách giấy', 'Combo'))
      )
    ORDER BY
      CASE WHEN (data->>'sortOrder') ~ '^[0-9]+$' THEN (data->>'sortOrder')::int ELSE 999999 END,
      created_at,
      id
  `;

  const qNorm = normVN(qRaw);
  const tokens = qNorm ? qNorm.split(/\s+/).filter(Boolean) : [];
  let matched = rows;
  if (tokens.length) {
    matched = rows.filter((r) => {
      const d = (r.data || {}) as Record<string, unknown>;
      const hay = normVN(
        `${d.title || ''} ${d.author || ''} ${d.isbn || ''} ${d.publisher || ''} ${d.category || ''}`
      );
      return tokens.every((t) => hay.includes(t));
    });
  }

  if (sort === 'az') {
    matched = [...matched].sort((a, b) =>
      String((a.data as Record<string, unknown>)?.title || '').localeCompare(
        String((b.data as Record<string, unknown>)?.title || ''),
        'vi'
      )
    );
  } else if (sort === 'newest') {
    matched = [...matched].reverse();
  }

  const total = matched.length;
  const page = matched.slice(offset, offset + limit).map((r) => {
    const purchased = bought.has(String(r.id));
    const item = publicItem(r, entitled || purchased);
    item.purchased = purchased;
    item.chapterCount = Number(r.chapter_count || 0);
    return item;
  });

  const nextCursor = offset + page.length < total ? String(offset + page.length) : null;
  return json({
    items: page,
    total,
    limit,
    offset,
    nextCursor,
    hasMore: nextCursor !== null,
  });
});
