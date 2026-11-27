import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { route, json, assertSameOrigin, parseBody, HttpError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { ASSET_RULES, assetKindSchema, assertAssetPath, safeOriginalName } from '@/lib/assets';
import { isR2Configured, r2PresignUrl } from '@/lib/r2';

export const runtime = 'nodejs';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const schema = z.object({
  kind: assetKindSchema,
  contentType: z.string().min(3).max(120),
  byteSize: z.number().int().positive(),
  originalName: z.string().max(512).optional(),
});

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`upload-presign:${user.id}`, 3000, 3600);
  const body = await parseBody(request, schema, 4096);

  const rule = ASSET_RULES[body.kind];
  const type = body.contentType.split(';')[0].trim().toLowerCase();
  if (!rule.types.includes(type)) {
    throw new HttpError(400, 'Định dạng tệp không được hỗ trợ.');
  }
  if (body.byteSize > rule.bytes) {
    throw new HttpError(413, 'Tệp vượt quá dung lượng cho phép.');
  }

  if (!isR2Configured()) {
    return json({ backend: 'vercel-blob' as const });
  }

  const rawName = safeOriginalName(body.originalName || '');
  const extMatch = rawName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch && rule.extensions.includes(extMatch[1]) ? extMatch[1] : (MIME_TO_EXT[type] || rule.extensions[0]);
  const pathname = `r2/lowf/${user.id}/${body.kind}/${randomUUID()}.${ext}`;
  assertAssetPath(pathname, user.id, body.kind);

  return json({
    backend: 'r2' as const,
    pathname,
    uploadUrl: r2PresignUrl('PUT', pathname, 900),
    contentType: type,
  });
});
