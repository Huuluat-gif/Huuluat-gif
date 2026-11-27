import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json } from '@/lib/api';
import { activeStorageBackend } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Admin Operations Center telemetry:
 * Real-time counts by lifecycle status, missing covers, duplicate checksums,
 * copyright review queue, broken/legacy asset references, R2 usage & cost estimate.
 */
export const GET = route(async () => {
  await requireAdmin();
  const sql = getSQL();

  const [statusRows, assetRows, qualityRows, dupRows, userCountRows] = await Promise.all([
    sql`
      SELECT status, COUNT(*)::int AS count
      FROM lowf_content
      WHERE kind = 'books'
      GROUP BY status
    `,
    sql`
      SELECT
        CASE WHEN pathname LIKE 'r2/%' OR pathname LIKE 'books/%' OR pathname LIKE 'covers/%' OR pathname LIKE 'assets/%' THEN 'r2' ELSE 'vercel-blob' END AS backend,
        kind,
        COUNT(*)::int AS count,
        COALESCE(SUM(byte_size), 0)::bigint AS bytes
      FROM lowf_assets
      GROUP BY 1, 2
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(data->>'coverAssetId', '') = '' AND COALESCE(data->>'cover', '') = '')::int AS missing_cover,
        COUNT(*) FILTER (WHERE COALESCE(data->>'coverAssetId', '') = '' AND COALESCE(data->>'cover', '') LIKE 'data:image/svg+xml%')::int AS svg_fallback_cover,
        COUNT(*) FILTER (WHERE COALESCE(data->>'copyrightStatus', 'needs_review') = 'needs_review')::int AS copyright_review,
        COUNT(*) FILTER (WHERE COALESCE(data->>'pdfAssetId', '') <> '')::int AS pdf_books,
        COUNT(*) FILTER (WHERE COALESCE(data->>'pdfAssetId', '') = '' AND jsonb_array_length(COALESCE(data->'chapters', '[]'::jsonb)) > 0)::int AS epub_books,
        COUNT(*) FILTER (
          WHERE COALESCE(data->>'pdfAssetId', '') <> ''
            AND NOT EXISTS (SELECT 1 FROM lowf_assets a WHERE a.id::text = data->>'pdfAssetId')
        )::int AS missing_pdf_assets,
        COUNT(*) FILTER (
          WHERE COALESCE(data->>'coverAssetId', '') <> ''
            AND NOT EXISTS (SELECT 1 FROM lowf_assets a WHERE a.id::text = data->>'coverAssetId')
        )::int AS missing_cover_assets,
        COUNT(*) FILTER (
          WHERE status = 'published' AND (
            EXISTS (SELECT 1 FROM lowf_assets a WHERE a.id::text = data->>'coverAssetId' AND a.pathname LIKE 'lowf/%')
            OR EXISTS (SELECT 1 FROM lowf_assets a WHERE a.id::text = data->>'pdfAssetId' AND a.pathname LIKE 'lowf/%')
          )
        )::int AS legacy_blob_published_books
      FROM lowf_content
      WHERE kind = 'books' AND status <> 'archived'
    `,
    sql`
      SELECT COUNT(*)::int AS dup_groups
      FROM (
        SELECT lower(trim(COALESCE(data->>'title', ''))) AS t
        FROM lowf_content
        WHERE kind = 'books' AND status <> 'archived'
        GROUP BY 1
        HAVING COUNT(*) > 1
      ) sub
    `,
    sql`SELECT COUNT(*)::int AS profiles FROM lowf_profiles`,
  ]);

  const byStatus: Record<string, number> = {
    draft: 0,
    processing: 0,
    needs_review: 0,
    ready: 0,
    published: 0,
    archived: 0,
    failed: 0,
  };
  let totalBooks = 0;
  for (const r of statusRows) {
    const st = String(r.status);
    const c = Number(r.count || 0);
    byStatus[st] = c;
    totalBooks += c;
  }

  let r2Bytes = 0;
  let r2Objects = 0;
  let blobBytes = 0;
  let blobObjects = 0;
  for (const a of assetRows) {
    const bytes = Number(a.bytes || 0);
    const cnt = Number(a.count || 0);
    if (a.backend === 'r2') {
      r2Bytes += bytes;
      r2Objects += cnt;
    } else {
      blobBytes += bytes;
      blobObjects += cnt;
    }
  }

  const r2Gb = r2Bytes / (1024 ** 3);
  const billableR2Gb = Math.max(0, r2Gb - 10);
  const estimatedR2MonthlyUsd = Math.round(billableR2Gb * 0.015 * 100) / 100;
  const q = qualityRows[0] || {};

  return json({
    activeBackend: activeStorageBackend(),
    books: {
      total: totalBooks,
      active: totalBooks - (byStatus.archived || 0),
      byStatus,
      pdfBooks: Number(q.pdf_books || 0),
      epubBooks: Number(q.epub_books || 0),
      missingCover: Number(q.missing_cover || 0),
      svgFallbackCover: Number(q.svg_fallback_cover || 0),
      copyrightReview: Number(q.copyright_review || 0),
      missingPdfAssets: Number(q.missing_pdf_assets || 0),
      missingCoverAssets: Number(q.missing_cover_assets || 0),
      legacyBlobPublishedBooks: Number(q.legacy_blob_published_books || 0),
      duplicateTitleGroups: Number(dupRows[0]?.dup_groups || 0),
    },
    storage: {
      r2: {
        objects: r2Objects,
        mb: Math.round((r2Bytes / 1048576) * 100) / 100,
        freeQuotaGb: 10,
        usagePercentOfFree: Math.round((r2Gb / 10) * 10000) / 100,
        estimatedMonthlyUsd: estimatedR2MonthlyUsd,
      },
      vercelBlob: {
        objects: blobObjects,
        mb: Math.round((blobBytes / 1048576) * 100) / 100,
      },
    },
    users: {
      profiles: Number(userCountRows[0]?.profiles || 0),
    },
  });
});
