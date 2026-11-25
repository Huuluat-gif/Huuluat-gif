import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { getUser } from '@/lib/auth/server';
import { json, route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { lookupTranslation, translationQuerySchema } from '@/lib/reader/translation';

export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  const params = new URL(request.url).searchParams;
  const query = translationQuerySchema.parse({ text: params.get('text') || '', source: params.get('source') || 'en', target: params.get('target') || 'vi' });
  const hasSessionCookie = request.headers.get('cookie')?.includes('__Secure-neon-auth.session_token=');
  const user = hasSessionCookie ? await getUser().catch(() => null) : null;
  // These headers are trusted only behind Vercel's ingress. Local development
  // shares one guest bucket instead of accepting spoofable proxy headers.
  const forwarded = process.env.VERCEL === '1' ? (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() : '';
  const guest = createHash('sha256').update(isIP(forwarded) ? forwarded : 'shared-guest').digest('hex').slice(0, 32);
  await rateLimit(user ? `reader-translate:user:${user.id}` : `reader-translate:guest:${guest}`, user ? 30 : 10, 60);
  return json(await lookupTranslation(query));
});
