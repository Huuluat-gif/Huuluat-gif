import { randomUUID } from 'node:crypto';
import { head } from '@vercel/blob';
import { z } from 'zod';
import { getSQL } from './db';
import { HttpError } from './api';
import { getUser } from './auth/server';
import { hasMembership } from './membership';
import { hasPurchasedBook } from './commerce';
import { blobToken,blobCredentials } from './blob-config';
import { isR2Path, r2HeadObject } from './r2';
import { storageSignedGetUrl, storageStream } from './storage';

export const assetKindSchema = z.enum(['image', 'pdf', 'audio', 'video']);
export type AssetKind = z.infer<typeof assetKindSchema>;
export const ASSET_RULES: Record<AssetKind, { bytes: number; types: string[]; extensions: string[] }> = {
  image: { bytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
  pdf: { bytes: 50 * 1024 * 1024, types: ['application/pdf'], extensions: ['pdf'] },
  audio: { bytes: 50 * 1024 * 1024, types: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/flac'], extensions: ['mp3', 'm4a', 'ogg', 'wav', 'webm', 'flac'] },
  video: { bytes: 250 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'], extensions: ['mp4', 'webm', 'mov'] },
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uploadNamePattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]+)$/i;
const canonicalR2Pattern = /^(books\/(?:pdf|epub)|covers\/(?:original|card|thumb)|assets)\/[a-zA-Z0-9._-]{1,120}\.([a-z0-9]+)$/i;

export function assertAssetPath(pathname: string, ownerId: string, kind: AssetKind): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId)) throw new HttpError(400, 'Định danh tài khoản không hợp lệ.');
  if (pathname.includes('..') || pathname.startsWith('/')) throw new HttpError(400, 'Đường dẫn tệp không hợp lệ.');
  const canonicalMatch = pathname.match(canonicalR2Pattern);
  if (canonicalMatch && ASSET_RULES[kind].extensions.includes(canonicalMatch[2].toLowerCase())) {
    return;
  }
  const normalized = pathname.startsWith('r2/') ? pathname.slice(3) : pathname;
  const prefix = `lowf/${ownerId}/${kind}/`;
  if (!normalized.startsWith(prefix)) throw new HttpError(403, 'Đường dẫn tải lên không thuộc tài khoản này.');
  const basename = normalized.slice(prefix.length);
  const match = basename.match(uploadNamePattern);
  if (!match || !ASSET_RULES[kind].extensions.includes(match[2].toLowerCase())) {
    throw new HttpError(400, 'Tên tệp tải lên phải gồm mã UUID và phần mở rộng đúng định dạng.');
  }
}

function storeHostname(): string {
  // Client uploads use this token; a different linked OIDC store must not change
  // which store we validate or read from after the upload completes.
  const rawStore = blobToken().split('_')[3];
  const store = rawStore?.replace(/^store_/, '').toLowerCase();
  if (!store || !/^[a-z0-9]+$/.test(store)) throw new HttpError(503, 'Kho tệp chưa được cấu hình.');
  return `${store}.private.blob.vercel-storage.com`;
}


export function validatePrivateBlobURL(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(400, 'Đường dẫn tệp không hợp lệ.'); }
  if (url.protocol !== 'https:' || url.hostname !== storeHostname() || url.port || url.username || url.password || url.search || url.hash) {
    throw new HttpError(400, 'Chỉ chấp nhận tệp trong kho riêng của Lowf.');
  }
  return url;
}

export function safeOriginalName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f/\\]/g, '').trim().slice(0, 180) : '';
}

export interface AssetRow {
  id: string;
  owner_id: string;
  pathname: string;
  kind: AssetKind;
  content_type: string;
  byte_size: number | string;
  original_name: string;
}

export function publicAsset(asset: AssetRow) {
  return { id: asset.id, kind: asset.kind, title: asset.original_name, originalName: asset.original_name, url: `/api/assets/${asset.id}`, size: Number(asset.byte_size), pathname: asset.pathname };
}

/** Called only after an authenticated admin finalize or SDK-verified Blob callback. */
export async function finalizeAsset(input: { url?: string; pathname?: string; kind: AssetKind; ownerId: string; originalName?: string; title?: string }) {
  let pathname: string;
  let type: string;
  let size: number;
  const rule = ASSET_RULES[input.kind];

  if (input.pathname && isR2Path(input.pathname.trim())) {
    pathname = input.pathname.trim();
    assertAssetPath(pathname, input.ownerId, input.kind);
    const meta = await r2HeadObject(pathname);
    type = meta.contentType;
    size = meta.size;
  } else if (input.url) {
    const url = validatePrivateBlobURL(input.url);
    try { pathname = decodeURIComponent(url.pathname.slice(1)); } catch { throw new HttpError(400, 'Đường dẫn tệp không hợp lệ.'); }
    assertAssetPath(pathname, input.ownerId, input.kind);
    // head() talks only to the configured Blob control API. The untrusted URL was validated first.
    const metadata = await head(pathname, blobCredentials());
    validatePrivateBlobURL(metadata.url);
    if (metadata.pathname !== pathname) throw new HttpError(400, 'Tệp tải lên không khớp đường dẫn được cấp.');
    type = metadata.contentType.split(';')[0].trim().toLowerCase();
    size = metadata.size;
  } else {
    throw new HttpError(400, 'Thiếu đường dẫn tệp cần xác nhận.');
  }

  if (!rule.types.includes(type) || !Number.isSafeInteger(size) || size <= 0 || size > rule.bytes) {
    throw new HttpError(400, 'Loại tệp hoặc dung lượng không đúng giới hạn.');
  }
  const originalName = safeOriginalName(input.originalName || input.title) || pathname.split('/').at(-1)!;
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO lowf_assets (id, owner_id, pathname, kind, content_type, byte_size, original_name)
    VALUES (${randomUUID()}, ${input.ownerId}, ${pathname}, ${input.kind}, ${type}, ${size}, ${originalName})
    ON CONFLICT (pathname) DO UPDATE SET pathname = EXCLUDED.pathname, byte_size = EXCLUDED.byte_size
    WHERE lowf_assets.owner_id = EXCLUDED.owner_id AND lowf_assets.kind = EXCLUDED.kind
    RETURNING id, owner_id, pathname, kind, content_type, byte_size, original_name
  `;
  if (!rows[0]) throw new HttpError(409, 'Tệp này đã thuộc một tài khoản khác.');
  return publicAsset(rows[0] as AssetRow);
}

let assetIndexesEnsured: Promise<void> | null = null;
function ensureAssetRefIndexes(): Promise<void> {
  if (!assetIndexesEnsured) {
    assetIndexesEnsured = (async () => {
      try {
        const sql = getSQL();
        await Promise.all([
          sql`CREATE INDEX IF NOT EXISTS idx_lowf_content_pub_cover ON lowf_content ((data->>'coverAssetId')) WHERE status = 'published'`,
          sql`CREATE INDEX IF NOT EXISTS idx_lowf_content_pub_pdf ON lowf_content ((data->>'pdfAssetId')) WHERE status = 'published'`,
          sql`CREATE INDEX IF NOT EXISTS idx_lowf_content_pub_asset ON lowf_content ((data->>'assetId')) WHERE status = 'published'`,
        ]);
      } catch {
        // Non-fatal if DB user lacks DDL privilege; query still runs cleanly.
      }
    })();
  }
  return assetIndexesEnsured;
}

const publicImageCache = new Map<string, { asset: AssetRow & { isPublic: true }; expiresAt: number }>();

export async function authorizeAssetRead(id: string): Promise<AssetRow & { isPublic?: boolean }> {
  if (!uuidPattern.test(id)) throw new HttpError(404, 'Không tìm thấy tệp.');
  id = id.toLowerCase();
  const cached = publicImageCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.asset;

  await ensureAssetRefIndexes();
  const sql = getSQL();
  const rows = await sql`SELECT id, owner_id, pathname, kind, content_type, byte_size, original_name FROM lowf_assets WHERE id = ${id}::uuid LIMIT 1`;
  const asset = rows[0] as AssetRow | undefined;
  if (!asset) throw new HttpError(404, 'Không tìm thấy tệp.');

  const cachePublicImage = (row: AssetRow) => {
    const out = { ...row, isPublic: true as const };
    if (row.kind === 'image') {
      if (publicImageCache.size >= 1000) publicImageCache.clear();
      publicImageCache.set(id, { asset: out, expiresAt: Date.now() + 5 * 60 * 1000 });
    }
    return out;
  };

  if (asset.kind === 'image') {
    const [coverRefs, designs] = await Promise.all([
      sql`SELECT 1 FROM lowf_content WHERE status = 'published' AND data->>'coverAssetId' = ${id} LIMIT 1`,
      sql`SELECT 1 FROM lowf_design_versions WHERE status = 'published' AND (settings->'hero'->>'imageAssetId' = ${id} OR settings->'brand'->>'logoAssetId' = ${id} OR settings->'brand'->>'faviconAssetId' = ${id} OR settings->'decor'->>'bgImageAssetId' = ${id}) LIMIT 1`,
    ]);
    if (coverRefs.length || designs.length) return cachePublicImage(asset);
    const user = await getUser();
    if (user && (user.isAdmin || user.id === asset.owner_id)) return asset;
    throw new HttpError(user ? 403 : 401, user ? 'Gói hiện tại chưa có quyền truy cập tệp này.' : 'Đăng nhập để đọc nội dung này.');
  }

  const references =
    asset.kind === 'pdf'
      ? await sql`SELECT id, kind, data->>'access' AS access FROM lowf_content WHERE status = 'published' AND data->>'pdfAssetId' = ${id} LIMIT 20`
      : await sql`SELECT id, kind, data->>'access' AS access FROM lowf_content WHERE status = 'published' AND data->>'assetId' = ${id} LIMIT 20`;

  if (references.some(row => row.access === 'free' || row.access == null)) return { ...asset, isPublic: true };
  const user = await getUser();
  if (user && (user.isAdmin || user.id === asset.owner_id)) return asset;
  if (user && references.length > 0 && await hasMembership(user.id)) return asset;
  if(user){for(const row of references){if(row.kind==='books'&&await hasPurchasedBook(user.id,String(row.id)))return asset;}}
  throw new HttpError(user ? 403 : 401, user ? 'Gói hiện tại chưa có quyền truy cập tệp này.' : 'Đăng nhập để đọc nội dung này.');
}

/** Stream small public images (book covers) directly so Cloudflare/Edge CDN & browsers cache them for 30 days. */
export async function streamPublicImageAsset(asset: AssetRow): Promise<Response | null> {
  if (asset.kind !== 'image' || Number(asset.byte_size) > 768 * 1024) return null;
  const result = await storageStream(asset.pathname);
  if (!result || !result.body) return null;
  return new Response(result.body, {
    status: 200,
    headers: {
      'Content-Type': asset.content_type || 'image/jpeg',
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** A short-lived, single-path capability avoids routing large files through Functions/Workers. */
export async function signedAssetURL(asset: AssetRow): Promise<string> {
  return storageSignedGetUrl(asset.pathname, 300);
}
