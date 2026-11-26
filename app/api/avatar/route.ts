import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireUser, syncProfile, ensureProfileAvatarColumn } from '@/lib/auth/server';
import { json, route, assertSameOrigin, parseBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

const avatarSchema = z.object({
  avatarUrl: z.string().max(140000).refine(
    (v) => v === '' || /^data:image\/(?:webp|png|jpeg|svg\+xml);(?:base64,|charset=UTF-8,)/i.test(v),
    'Định dạng ảnh đại diện không hợp lệ.'
  ),
}).strict();

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await rateLimit(`avatar:${user.id}`, 30, 60);
  const body = await parseBody(request, avatarSchema);
  await ensureProfileAvatarColumn();
  await syncProfile(user);
  const sql = getSQL();
  await sql`UPDATE lowf_profiles SET avatar_url=${body.avatarUrl}, updated_at=now() WHERE user_id=${user.id}`;
  return json({ ok: true, avatarUrl: body.avatarUrl });
});
