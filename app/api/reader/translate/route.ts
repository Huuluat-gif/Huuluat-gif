import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { getUser } from '@/lib/auth/server';
import { json, route } from '@/lib/api';
import { getTrustedClientIp } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { lookupTranslation, translationQuerySchema } from '@/lib/reader/translation';

export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  const params = new URL(request.url).searchParams;
  const query = translationQuerySchema.parse({ text: params.get('text') || '', source: params.get('source') || 'en', target: params.get('target') || 'vi' });
  const hasSessionCookie = request.headers.get('cookie')?.includes('__Secure-neon-auth.session_token=');
  const user = hasSessionCookie ? await getUser().catch(() => null) : null;
  // Trust only platform-verified ingress headers (Cloudflare CF-Connecting-IP or Vercel).
  const forwarded = getTrustedClientIp(request);
  const guest = createHash('sha256').update(isIP(forwarded) ? forwarded : 'shared-guest').digest('hex').slice(0, 32);
  await rateLimit(user ? `reader-translate:user:${user.id}` : `reader-translate:guest:${guest}`, user ? 30 : 10, 60);
  return json(await lookupTranslation(query));
});
