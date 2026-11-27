import { getSQL } from '@/lib/db';
import { getUser } from '@/lib/auth/server';
import { route, HttpError } from '@/lib/api';
import { hasMembership } from '@/lib/membership';
import { publicItem } from '@/lib/content';
import { idSchema } from '@/lib/validation';
import { hasPurchasedBook } from '@/lib/commerce';
import { isR2Path } from '@/lib/r2';
import { storageSignedGetUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Ultra-fast book detail endpoint:
 * - Free books bypass session/membership/order SQL round-trips and are Edge-cacheable on Cloudflare CDN.
 * - PDF books include a short-lived direct Cloudflare R2 signed GET URL (`signedPdfUrl`) so PDF.js
 *   streams HTTP 206 Range chunks directly from R2 APAC (~30-60ms) without bouncing through US serverless.
 */
export const GET = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  idSchema.parse(id);
  const sql = getSQL();
  const rows = await sql`
    SELECT kind, id, data, status
    FROM lowf_content
    WHERE kind = 'books' AND id = ${id} AND status = 'published'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new HttpError(404, 'Không tìm thấy sách.');

  const data = row.data as Record<string, unknown>;
  const isMemberOnly = data.access === 'member';
  let entitled = !isMemberOnly;

  if (isMemberOnly) {
    const user = await getUser();
    entitled =
      !!user &&
      (user.isAdmin || (await hasMembership(user.id)) || (await hasPurchasedBook(user.id, id)));
    if (!entitled) {
      throw new HttpError(
        403,
        'Cần mua sách hoặc có gói thành viên phù hợp để đọc.',
        'MEMBERSHIP_REQUIRED'
      );
    }
  }

  const book = publicItem(row, entitled);
  let hasDirectR2Pdf = false;
  const pdfAssetId = typeof data.pdfAssetId === 'string' ? data.pdfAssetId : '';
  if (pdfAssetId && entitled) {
    try {
      const assetRows = await sql`
        SELECT pathname FROM lowf_assets WHERE id = ${pdfAssetId}::uuid LIMIT 1
      `;
      const pathname = String(assetRows[0]?.pathname || '');
      if (pathname && isR2Path(pathname)) {
        // 15-minute signed R2 URL allows direct browser Range streaming from Cloudflare R2 APAC
        book.signedPdfUrl = await storageSignedGetUrl(pathname, 900);
        hasDirectR2Pdf = true;
      }
    } catch {
      // Non-fatal fallback: client falls back to /api/assets/<pdfAssetId>
    }
  }

  const cacheControl = isMemberOnly
    ? 'private, no-store, max-age=0'
    : hasDirectR2Pdf
      ? 'public, max-age=60, s-maxage=180, stale-while-revalidate=120'
      : 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  };
  if (isMemberOnly) headers.Vary = 'Cookie';

  return new Response(JSON.stringify({ book }), { status: 200, headers });
});
