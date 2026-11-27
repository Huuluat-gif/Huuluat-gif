import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { getSQL } from '@/lib/db';
import { route, json, assertSameOrigin, HttpError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { blobCredentials } from '@/lib/blob-config';
import { ASSET_RULES, assetKindSchema, assertAssetPath, publicAsset, safeOriginalName, type AssetRow } from '@/lib/assets';

export const runtime = 'nodejs';
const MAX_DIRECT_BYTES = Math.floor(3.8 * 1024 * 1024);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
};

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`upload-direct:${user.id}`, 3000, 3600);

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size <= 0) {
    throw new HttpError(400, 'Thiếu tệp cần tải lên.');
  }
  const kind = assetKindSchema.parse(String(form.get('kind') || ''));
  const rule = ASSET_RULES[kind];
  const type = (file.type || '').split(';')[0].trim().toLowerCase();
  if (!rule.types.includes(type)) {
    throw new HttpError(400, 'Định dạng tệp không được hỗ trợ.');
  }
  if (file.size > Math.min(rule.bytes, MAX_DIRECT_BYTES)) {
    throw new HttpError(413, 'Tệp vượt quá giới hạn tải trực tiếp (3.8 MB).');
  }
  const rawName = safeOriginalName(String(form.get('originalName') || file.name || ''));
  const extMatch = rawName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch && rule.extensions.includes(extMatch[1]) ? extMatch[1] : (MIME_TO_EXT[type] || rule.extensions[0]);
  const pathname = `lowf/${user.id}/${kind}/${randomUUID()}.${ext}`;
  assertAssetPath(pathname, user.id, kind);

  const buffer = Buffer.from(await file.arrayBuffer());
  await put(pathname, buffer, {
    access: 'private',
    contentType: type,
    addRandomSuffix: false,
    ...blobCredentials(),
  });

  const originalName = rawName || pathname.split('/').at(-1)!;
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO lowf_assets (id, owner_id, pathname, kind, content_type, byte_size, original_name)
    VALUES (${randomUUID()}, ${user.id}, ${pathname}, ${kind}, ${type}, ${buffer.byteLength}, ${originalName})
    ON CONFLICT (pathname) DO UPDATE SET byte_size = EXCLUDED.byte_size
    WHERE lowf_assets.owner_id = EXCLUDED.owner_id AND lowf_assets.kind = EXCLUDED.kind
    RETURNING id, owner_id, pathname, kind, content_type, byte_size, original_name
  `;
  if (!rows[0]) throw new HttpError(409, 'Không thể lưu tệp vào kho tài nguyên.');
  return json({ asset: publicAsset(rows[0] as AssetRow) }, 201);
});
