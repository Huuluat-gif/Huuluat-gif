import { route } from '@/lib/api';
import { authorizeAssetRead, signedAssetURL, streamPublicImageAsset } from '@/lib/assets';
import { isR2Path } from '@/lib/r2';
import { storageStream } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = route(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const asset = await authorizeAssetRead(id);
  if (asset.isPublic && asset.kind === 'image') {
    const cached = await streamPublicImageAsset(asset);
    if (cached) return cached;
  }
  // Support direct HTTP Range streaming on R2 when clients request byte ranges through the API
  const range = request.headers.get('range') || '';
  if (range && isR2Path(asset.pathname) && /^bytes=\d*-\d*$/.test(range.trim())) {
    const streamed = await storageStream(asset.pathname, { range: range.trim() });
    if (streamed) {
      const headers = new Headers({
        'Content-Type': asset.content_type || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Cache-Control': asset.isPublic ? 'public, max-age=300, stale-while-revalidate=3600' : 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      });
      if (!asset.isPublic) headers.set('Vary', 'Cookie');
      for (const h of ['content-length', 'content-range', 'etag', 'last-modified']) {
        const val = streamed.headers.get(h);
        if (val) headers.set(h, val);
      }
      return new Response(streamed.body, { status: streamed.status, headers });
    }
  }
  const url = await signedAssetURL(asset);
  return new Response(null, {
    status: 307,
    headers: {
      Location: url,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
    },
  });
});
