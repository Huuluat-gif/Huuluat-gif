import { z } from 'zod';
import { route, json, assertSameOrigin, parseBody } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { assetKindSchema, finalizeAsset } from '@/lib/assets';

export const runtime = 'nodejs';
const schema = z.object({ url: z.string().url().max(1000), kind: assetKindSchema, originalName: z.string().max(512).optional(), title: z.string().max(512).optional() });
export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  const body = await parseBody(request, schema, 4096);
  await rateLimit(`upload-finalize:${user.id}`, 120, 3600);
  const asset = await finalizeAsset({ ...body, ownerId: user.id });
  return json({ asset }, 201);
});
