import { randomUUID } from 'node:crypto';
import { get as getBlob, head, issueSignedToken, presignUrl } from '@vercel/blob';
import { z } from 'zod';
import { getSQL } from './db';
import { HttpError } from './api';
import { getUser } from './auth/server';
import { hasMembership } from './membership';
import { hasPurchasedBook } from './commerce';
import { blobToken,blobCredentials } from './blob-config';

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

export function assertAssetPath(pathname: string, ownerId: string, kind: AssetKind): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId)) throw new HttpError(400, 'Định danh tài khoản không hợp lệ.');
  const prefix = `lowf/${ownerId}/${kind}/`;
  if (!pathname.startsWith(prefix)) throw new HttpError(403, 'Đường dẫn tải lên không thuộc tài khoản này.');
  const basename = pathname.slice(prefix.length);
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
export async function finalizeAsset(input: { url: string; kind: AssetKind; ownerId: string; originalName?: string; title?: string }) {
  const url = validatePrivateBlobURL(input.url);
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname.slice(1)); } catch { throw new HttpError(400, 'Đường dẫn tệp không hợp lệ.'); }
  assertAssetPath(pathname, input.ownerId, input.kind);
  // head() talks only to the configured Blob control API. The untrusted URL was validated first.
  const metadata = await head(pathname, blobCredentials());
  validatePrivateBlobURL(metadata.url);
  if (metadata.pathname !== pathname) throw new HttpError(400, 'Tệp tải lên không khớp đường dẫn được cấp.');
  const rule = ASSET_RULES[input.kind];
  const type = metadata.contentType.split(';')[0].trim().toLowerCase();
  if (!rule.types.includes(type) || !Number.isSafeInteger(metadata.size) || metadata.size <= 0 || metadata.size > rule.bytes) {
    throw new HttpError(400, 'Loại tệp hoặc dung lượng không đúng giới hạn.');
  }
  const originalName = safeOriginalName(input.originalName || input.title) || pathname.split('/').at(-1)!;
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO lowf_assets (id, owner_id, pathname, kind, content_type, byte_size, original_name)
    VALUES (${randomUUID()}, ${input.ownerId}, ${pathname}, ${input.kind}, ${type}, ${metadata.size}, ${originalName})
    ON CONFLICT (pathname) DO UPDATE SET pathname = EXCLUDED.pathname
    WHERE lowf_assets.owner_id = EXCLUDED.owner_id AND lowf_assets.kind = EXCLUDED.kind
    RETURNING id, owner_id, pathname, kind, content_type, byte_size, original_name
  `;
  if (!rows[0]) throw new HttpError(409, 'Tệp này đã thuộc một tài khoản khác.');
  return publicAsset(rows[0] as AssetRow);
}

export async function authorizeAssetRead(id: string): Promise<AssetRow & { isPublic?: boolean }> {
  if (!uuidPattern.test(id)) throw new HttpError(404, 'Không tìm thấy tệp.');
  id = id.toLowerCase();
  const sql = getSQL();
  const rows = await sql`SELECT id, owner_id, pathname, kind, content_type, byte_size, original_name FROM lowf_assets WHERE id = ${id}::uuid LIMIT 1`;
  const asset = rows[0] as AssetRow | undefined;
  if (!asset) throw new HttpError(404, 'Không tìm thấy tệp.');
  if (asset.kind === 'image') {
    const designs = await sql`SELECT 1 FROM lowf_design_versions WHERE status = 'published' AND settings->'hero'->>'imageAssetId' = ${id} LIMIT 1`;
    if (designs.length) return { ...asset, isPublic: true };
  }
  const references = await sql`
    SELECT id,kind,data->>'access' AS access, data->>'coverAssetId' AS cover_id
    FROM lowf_content
    WHERE status = 'published'
      AND (data->>'coverAssetId' = ${id} OR data->>'pdfAssetId' = ${id} OR data->>'assetId' = ${id})
    LIMIT 100
  `;
  if (references.some(row => (asset.kind === 'image' && row.cover_id === id) || row.access === 'free' || row.access == null)) return { ...asset, isPublic: true };
  const user = await getUser();
  if (user && (user.isAdmin || user.id === asset.owner_id)) return asset;
  if (user && references.length > 0 && await hasMembership(user.id)) return asset;
  if(user){for(const row of references){if(row.kind==='books'&&await hasPurchasedBook(user.id,String(row.id)))return asset;}}
  throw new HttpError(user ? 403 : 401, user ? 'Gói hiện tại chưa có quyền truy cập tệp này.' : 'Đăng nhập để đọc nội dung này.');
}

/** Stream small public images (book covers) directly so Vercel Edge CDN & browsers cache them for 30 days. */
export async function streamPublicImageAsset(asset: AssetRow): Promise<Response | null> {
  if (asset.kind !== 'image' || Number(asset.byte_size) > 768 * 1024) return null;
  const result = await getBlob(asset.pathname, { access: 'private', ...blobCredentials() });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream, {
    status: 200,
    headers: {
      'Content-Type': asset.content_type || 'image/jpeg',
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** A short-lived, single-path capability avoids routing large files through Functions. */
export async function signedAssetURL(asset: AssetRow): Promise<string> {
  const validUntil = Date.now() + 5 * 60 * 1000;
  const token = await issueSignedToken({ ...blobCredentials(), pathname: asset.pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname: asset.pathname, access: 'private', validUntil });
  return presignedUrl;
}
