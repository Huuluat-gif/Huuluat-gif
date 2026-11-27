import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json } from '@/lib/api';
import { activeStorageBackend } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Admin Operations Center telemetry (fast — never detoasts large JSONB `chapters` arrays):
 * Real-time counts by lifecycle status, missing covers, duplicate titles,
 * copyright review queue, broken/legacy asset references, R2 usage & cost estimate.
 */
export const GET = route(async () => {
  await requireAdmin();
  const sql = getSQL();

  const [statusRows, assetRows, bookMetaRows, userCountRows] = await Promise.all([
    sql`
      SELECT status, COUNT(*)::int AS count
      FROM lowf_content
      WHERE kind = 'books'
      GROUP BY status
    `,
    sql`
      SELECT
        id::text AS id,
        CASE WHEN pathname LIKE 'r2/%' OR pathname LIKE 'books/%' OR pathname LIKE 'covers/%' OR pathname LIKE 'assets/%' THEN 'r2' ELSE 'vercel-blob' END AS backend,
        kind,
        byte_size::bigint AS bytes
      FROM lowf_assets
    `,
    sql`
      SELECT
        id,
        status,
        COALESCE(data->>'title', '') AS title,
        COALESCE(data->>'coverAssetId', '') AS cover_id,
        LEFT(COALESCE(data->>'cover', ''), 24) AS cover_prefix,
        COALESCE(data->>'pdfAssetId', '') AS pdf_id,
        COALESCE(data->>'copyrightStatus', 'needs_review') AS copyright_status
      FROM lowf_content
      WHERE kind = 'books' AND status <> 'archived'
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
  const assetBackendMap = new Map<string, 'r2' | 'vercel-blob'>();
  for (const a of assetRows) {
    const id = String(a.id);
    const backend = a.backend === 'r2' ? 'r2' : 'vercel-blob';
    assetBackendMap.set(id, backend);
    const bytes = Number(a.bytes || 0);
    if (backend === 'r2') {
      r2Bytes += bytes;
      r2Objects += 1;
    } else {
      blobBytes += bytes;
      blobObjects += 1;
    }
  }

  let missingCover = 0;
  let svgFallbackCover = 0;
  let copyrightReview = 0;
  let pdfBooks = 0;
  let epubBooks = 0;
  let missingPdfAssets = 0;
  let missingCoverAssets = 0;
  let legacyBlobPublishedBooks = 0;
  const titleCounts = new Map<string, number>();

  for (const b of bookMetaRows) {
    const coverId = String(b.cover_id || '');
    const coverPrefix = String(b.cover_prefix || '');
    const pdfId = String(b.pdf_id || '');
    const status = String(b.status || '');
    const titleNorm = String(b.title || '').trim().toLowerCase();
    if (titleNorm) titleCounts.set(titleNorm, (titleCounts.get(titleNorm) || 0) + 1);

    if (!coverId && !coverPrefix) missingCover += 1;
    else if (!coverId && coverPrefix.startsWith('data:image/svg+xml')) svgFallbackCover += 1;

    if (String(b.copyright_status || 'needs_review') === 'needs_review') copyrightReview += 1;

    if (pdfId) {
      pdfBooks += 1;
      if (!assetBackendMap.has(pdfId)) missingPdfAssets += 1;
    } else {
      epubBooks += 1;
    }

    if (coverId && !assetBackendMap.has(coverId)) missingCoverAssets += 1;

    if (status === 'published') {
      const covLegacy = Boolean(coverId && assetBackendMap.get(coverId) === 'vercel-blob');
      const pdfLegacy = Boolean(pdfId && assetBackendMap.get(pdfId) === 'vercel-blob');
      if (covLegacy || pdfLegacy) legacyBlobPublishedBooks += 1;
    }
  }

  let duplicateTitleGroups = 0;
  for (const count of titleCounts.values()) {
    if (count > 1) duplicateTitleGroups += 1;
  }

  const r2Gb = r2Bytes / (1024 ** 3);
  const billableR2Gb = Math.max(0, r2Gb - 10);
  const estimatedR2MonthlyUsd = Math.round(billableR2Gb * 0.015 * 100) / 100;

  return json({
    activeBackend: activeStorageBackend(),
    books: {
      total: totalBooks,
      active: totalBooks - (byStatus.archived || 0),
      byStatus,
      pdfBooks,
      epubBooks,
      missingCover,
      svgFallbackCover,
      copyrightReview,
      missingPdfAssets,
      missingCoverAssets,
      legacyBlobPublishedBooks,
      duplicateTitleGroups,
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
