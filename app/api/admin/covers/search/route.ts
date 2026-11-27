import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json, assertSameOrigin, parseBody, HttpError } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { publicAsset, safeOriginalName, type AssetRow } from '@/lib/assets';
import { activeStorageBackend, storagePut } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Strict allowlist of trusted bibliographic cover providers (prevents SSRF). */
const ALLOWED_COVER_HOSTS = new Set([
  'covers.openlibrary.org',
  'books.google.com',
  'books.googleusercontent.com',
  'lh3.googleusercontent.com',
]);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_COVER_BYTES = 3 * 1024 * 1024;

export interface CoverCandidate {
  id: string;
  provider: 'openlibrary' | 'google-books';
  title: string;
  author: string;
  isbn?: string;
  publishedYear?: string;
  thumbnailUrl: string;
  imageUrl: string;
  licenseNote: string;
}

function validateAllowedCoverUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new HttpError(400, 'URL ảnh bìa không hợp lệ.');
  }
  if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password) {
    throw new HttpError(400, 'Chỉ chấp nhận ảnh bìa HTTPS từ nguồn thư mục được phép.');
  }
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_COVER_HOSTS.has(host)) {
    throw new HttpError(403, 'Nguồn ảnh bìa nằm ngoài danh sách cho phép (Open Library / Google Books).');
  }
  return parsed;
}

/**
 * GET /api/admin/covers/search?title=...&author=...&isbn=...
 * Searches Open Library & Google Books for verified edition covers without exposing user browsers to CORS issues.
 */
export const GET = route(async (request: Request) => {
  const user = await requireAdmin();
  await rateLimit(`cover-search:${user.id}`, 60, 60);
  const params = new URL(request.url).searchParams;
  const title = (params.get('title') || '').trim().slice(0, 140);
  const author = (params.get('author') || '').trim().slice(0, 100);
  const isbn = (params.get('isbn') || '').replace(/[^0-9Xx-]/g, '').slice(0, 20);
  if (!title && !isbn) {
    throw new HttpError(400, 'Cần nhập tên sách hoặc mã ISBN để tìm kiếm bìa.');
  }

  const candidates: CoverCandidate[] = [];
  const olQuery = isbn
    ? `isbn=${encodeURIComponent(isbn)}`
    : `title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ''}`;
  const gbQuery = isbn
    ? `isbn:${isbn}`
    : `${title}${author ? ` inauthor:${author}` : ''}`;

  const [olRes, gbRes] = await Promise.allSettled([
    fetch(`https://openlibrary.org/search.json?${olQuery}&limit=6&fields=key,title,author_name,cover_i,isbn,first_publish_year`, {
      signal: AbortSignal.timeout(7000),
      headers: { 'User-Agent': 'LowfLibrary/2.0 (+https://www.lowflibray.com)' },
    }),
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbQuery)}&maxResults=6&printType=books`, {
      signal: AbortSignal.timeout(7000),
    }),
  ]);

  if (olRes.status === 'fulfilled' && olRes.value.ok) {
    try {
      const data = (await olRes.value.json()) as {
        docs?: Array<{ key?: string; title?: string; author_name?: string[]; cover_i?: number; isbn?: string[]; first_publish_year?: number }>;
      };
      for (const doc of data.docs || []) {
        if (!doc.cover_i) continue;
        candidates.push({
          id: `ol-${doc.cover_i}`,
          provider: 'openlibrary',
          title: String(doc.title || title).slice(0, 140),
          author: String(doc.author_name?.[0] || author || '').slice(0, 100),
          isbn: doc.isbn?.[0],
          publishedYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          thumbnailUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
          imageUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
          licenseNote: 'Open Library Covers API (tham khảo thư mục)',
        });
      }
    } catch {
      // ignore malformed upstream JSON
    }
  }

  if (gbRes.status === 'fulfilled' && gbRes.value.ok) {
    try {
      const data = (await gbRes.value.json()) as {
        items?: Array<{
          id?: string;
          volumeInfo?: {
            title?: string;
            authors?: string[];
            publishedDate?: string;
            industryIdentifiers?: Array<{ identifier?: string }>;
            imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          };
        }>;
      };
      for (const item of data.items || []) {
        const rawThumb = item.volumeInfo?.imageLinks?.thumbnail || item.volumeInfo?.imageLinks?.smallThumbnail || '';
        if (!rawThumb) continue;
        const httpsUrl = rawThumb.replace(/^http:\/\//i, 'https://').replace(/&edge=curl/i, '');
        try {
          validateAllowedCoverUrl(httpsUrl);
        } catch {
          continue;
        }
        const hiRes = httpsUrl.replace(/zoom=\d/i, 'zoom=2');
        candidates.push({
          id: `gb-${item.id || randomUUID().slice(0, 8)}`,
          provider: 'google-books',
          title: String(item.volumeInfo?.title || title).slice(0, 140),
          author: String(item.volumeInfo?.authors?.[0] || author || '').slice(0, 100),
          isbn: item.volumeInfo?.industryIdentifiers?.[0]?.identifier,
          publishedYear: item.volumeInfo?.publishedDate?.slice(0, 4),
          thumbnailUrl: httpsUrl,
          imageUrl: hiRes,
          licenseNote: 'Google Books API (tham khảo thư mục)',
        });
      }
    } catch {
      // ignore malformed upstream JSON
    }
  }

  return json({ candidates: candidates.slice(0, 12), total: candidates.length });
});

const importSchema = z.object({
  imageUrl: z.string().url().max(1000),
  bookTitle: z.string().trim().max(160).optional(),
  provider: z.enum(['openlibrary', 'google-books']).optional(),
});

/**
 * POST /api/admin/covers/search
 * SSRF-hardened server-side import of a verified bibliographic cover into Lowf R2 storage.
 */
export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`cover-import:${user.id}`, 40, 60);
  const body = await parseBody(request, importSchema, 4096);

  const safeUrl = validateAllowedCoverUrl(body.imageUrl);
  const res = await fetch(safeUrl.toString(), {
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'LowfLibrary/2.0 (+https://www.lowflibray.com)' },
  });

  // Follow at most 1 redirect ONLY if target host is also on the strict allowlist
  let finalRes = res;
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location') || '';
    const nextUrl = validateAllowedCoverUrl(new URL(loc, safeUrl).toString());
    finalRes = await fetch(nextUrl.toString(), {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
  }
  if (!finalRes.ok) {
    throw new HttpError(502, `Không thể tải ảnh bìa từ nguồn (HTTP ${finalRes.status}).`);
  }

  const contentType = (finalRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new HttpError(400, 'Tệp tải về không phải định dạng ảnh hợp lệ (JPEG/PNG/WebP/AVIF).');
  }
  const arrayBuf = await finalRes.arrayBuffer();
  if (arrayBuf.byteLength < 1200 || arrayBuf.byteLength > MAX_COVER_BYTES) {
    throw new HttpError(400, 'Ảnh bìa rỗng hoặc vượt quá giới hạn 3 MB.');
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/avif' ? 'avif' : 'jpg';
  const useR2 = activeStorageBackend() === 'r2';
  const key = `${useR2 ? 'r2/' : ''}lowf/${user.id}/image/${randomUUID()}.${ext}`;
  const putResult = await storagePut(key, Buffer.from(arrayBuf), contentType, {
    cacheControl: 'public, max-age=31536000, immutable',
  });

  const originalName = `${safeOriginalName(body.bookTitle || 'cover').slice(0, 80) || 'cover'}.${ext}`;
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO lowf_assets (id, owner_id, pathname, kind, content_type, byte_size, original_name)
    VALUES (${randomUUID()}, ${user.id}, ${putResult.key}, 'image', ${contentType}, ${putResult.size}, ${originalName})
    RETURNING id, owner_id, pathname, kind, content_type, byte_size, original_name
  `;
  return json({
    asset: publicAsset(rows[0] as AssetRow),
    coverSource: body.provider || safeUrl.hostname,
    backend: putResult.backend,
    sha256: putResult.sha256,
  }, 201);
});
