import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { z } from 'zod';
import { route, json, assertSameOrigin, parseBody, HttpError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { blobToken } from '@/lib/blob-config';
import { ASSET_RULES, assetKindSchema, assertAssetPath, finalizeAsset, safeOriginalName } from '@/lib/assets';

export const runtime = 'nodejs';
const payloadSchema = z.object({ kind: assetKindSchema, title: z.string().max(512).optional(), originalName: z.string().max(512).optional() });
const callbackPayloadSchema = payloadSchema.extend({ ownerId: z.string().min(1).max(128) });
const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('blob.generate-client-token'), payload: z.object({ pathname: z.string().min(1).max(300), multipart: z.boolean(), clientPayload: z.string().max(1000).nullable() }) }),
  z.object({ type: z.literal('blob.upload-completed'), payload: z.object({ blob: z.object({ url: z.string().max(1000) }).passthrough(), tokenPayload: z.string().max(2000).nullish() }) }),
]);

export const POST = route(async (request: Request) => {
  const originalBody = await parseBody(request, z.unknown(), 16 * 1024);
  const validation = eventSchema.safeParse(originalBody);
  if (!validation.success) throw new HttpError(400, 'Yêu cầu tải tệp không hợp lệ.');
  // Preserve key order and fields for the Blob callback HMAC calculation.
  const body = originalBody as HandleUploadBody;
  // Completion callbacks have no session or Origin. handleUpload verifies their HMAC before invoking our callback.
  if (body.type === 'blob.generate-client-token') assertSameOrigin(request);
  else if (!/^[a-f0-9]{64}$/i.test(request.headers.get('x-vercel-signature') || '')) {
    // Reject malformed input before the SDK's hex decoder. Authenticity is
    // still verified by handleUpload using the configured store token.
    throw new HttpError(403, 'Chữ ký xác nhận tệp không hợp lệ.');
  }
  try {
    const result = await handleUpload({
      token: blobToken(),
      request,
      body: body as HandleUploadBody,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await requireAdmin();
        let data: z.infer<typeof payloadSchema>;
        try { data = payloadSchema.parse(JSON.parse(clientPayload || '{}')); }
        catch { throw new HttpError(400, 'Hãy chọn đúng loại tệp cần tải lên.'); }
        assertAssetPath(pathname, user.id, data.kind);
        await rateLimit(`upload:${user.id}`, 3000, 3600);
        const rule = ASSET_RULES[data.kind];
        return {
          allowedContentTypes: rule.types,
          maximumSizeInBytes: rule.bytes,
          validUntil: Date.now() + 15 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60,
          tokenPayload: JSON.stringify({ ownerId: user.id, kind: data.kind, originalName: safeOriginalName(data.originalName || data.title) }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let payload: z.infer<typeof callbackPayloadSchema>;
        try { payload = callbackPayloadSchema.parse(JSON.parse(tokenPayload || '{}')); }
        catch { throw new HttpError(400, 'Thiếu thông tin xác nhận tệp.'); }
        await finalizeAsset({ url: blob.url, ...payload });
      },
    });
    return json(result);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && /signature/i.test(error.message)) throw new HttpError(403, 'Chữ ký xác nhận tệp không hợp lệ.');
    throw new HttpError(502, 'Kho tệp chưa phản hồi. Vui lòng thử lại.');
  }
});
