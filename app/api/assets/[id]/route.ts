import { route } from '@/lib/api';
import { authorizeAssetRead, signedAssetURL } from '@/lib/assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = route(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const asset = await authorizeAssetRead(id);
  const url = await signedAssetURL(asset);
  return new Response(null, {
    status: 307,
    headers: { Location: url, 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' },
  });
});
