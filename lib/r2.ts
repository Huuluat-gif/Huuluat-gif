import { createHash, createHmac } from 'node:crypto';
import { HttpError } from './api';
import { isIsolatedPreviewEnv } from './env';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface R2ObjectHead {
  size: number;
  contentType: string;
  etag?: string;
  lastModified?: string;
  acceptRanges?: string;
}

export function getR2Config(): R2Config | null {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (
    isIsolatedPreviewEnv()
      ? (process.env.R2_STAGING_BUCKET || process.env.R2_PREVIEW_BUCKET || process.env.R2_BUCKET || '')
      : (process.env.R2_BUCKET || '')
  ).trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function isR2Path(pathname: string): boolean {
  return (
    pathname.startsWith('r2/') ||
    pathname.startsWith('books/') ||
    pathname.startsWith('covers/') ||
    pathname.startsWith('assets/')
  );
}

function requireR2(): R2Config {
  const cfg = getR2Config();
  if (!cfg) throw new HttpError(503, 'Kho lưu trữ Cloudflare R2 chưa được cấu hình.');
  return cfg;
}

function encodeRFC3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeKeyPath(bucket: string, key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  return `/${encodeRFC3986(bucket)}/${cleanKey.split('/').map(encodeRFC3986).join('/')}`;
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function signingKey(secretAccessKey: string, dateStamp: string): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function amzTimestamps(now = new Date()): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function r2SignedFetch(
  method: 'GET' | 'HEAD' | 'PUT' | 'DELETE' | 'POST',
  key: string,
  options?: {
    body?: Buffer | Uint8Array;
    contentType?: string;
    range?: string;
    cacheControl?: string;
    query?: Record<string, string>;
    retries?: number;
  }
): Promise<Response> {
  const cfg = requireR2();
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = encodeKeyPath(cfg.bucket, key);
  const queryEntries = Object.entries(options?.query || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQuery = queryEntries
    .map(([k, v]) => `${encodeRFC3986(k)}=${encodeRFC3986(v)}`)
    .join('&');
  const maxRetries = Math.max(0, Math.min(4, options?.retries ?? 2));

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { amzDate, dateStamp } = amzTimestamps();
      const body = options?.body;
      const payloadHash = sha256Hex(body ?? '');

      const headersToSign: Record<string, string> = {
        host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      };
      if (options?.contentType) headersToSign['content-type'] = options.contentType;
      if (options?.cacheControl) headersToSign['cache-control'] = options.cacheControl;
      if (options?.range) headersToSign['range'] = options.range;

      const sortedNames = Object.keys(headersToSign).sort();
      const canonicalHeaders = sortedNames.map((k) => `${k}:${headersToSign[k]}\n`).join('');
      const signedHeaders = sortedNames.join(';');

      const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join('\n');

      const scope = `${dateStamp}/auto/s3/aws4_request`;
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        scope,
        sha256Hex(canonicalRequest),
      ].join('\n');

      const signature = createHmac('sha256', signingKey(cfg.secretAccessKey, dateStamp))
        .update(stringToSign)
        .digest('hex');

      const reqHeaders: Record<string, string> = {
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      };
      if (options?.contentType) reqHeaders['Content-Type'] = options.contentType;
      if (options?.cacheControl) reqHeaders['Cache-Control'] = options.cacheControl;
      if (options?.range) reqHeaders['Range'] = options.range;

      const fullUrl = `https://${host}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ''}`;
      const res = await fetch(fullUrl, {
        method,
        headers: reqHeaders,
        body: body ? new Uint8Array(body) : undefined,
        cache: 'no-store',
      });
      if (!isRetryableStatus(res.status) || attempt === maxRetries) {
        return res;
      }
      await sleep(250 * Math.pow(2, attempt));
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) throw err;
      await sleep(250 * Math.pow(2, attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new HttpError(502, 'Không thể kết nối tới Cloudflare R2.');
}

export function r2PresignUrl(
  method: 'GET' | 'PUT',
  key: string,
  expiresSeconds = 300,
  extraQuery?: Record<string, string>
): string {
  const cfg = requireR2();
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = encodeKeyPath(cfg.bucket, key);
  const { amzDate, dateStamp } = amzTimestamps();
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const expires = Math.max(60, Math.min(3600, Math.round(expiresSeconds)));

  const queryParams: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${cfg.accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expires)],
    ['X-Amz-SignedHeaders', 'host'],
    ...Object.entries(extraQuery || {}),
  ];
  queryParams.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQuery = queryParams
    .map(([k, v]) => `${encodeRFC3986(k)}=${encodeRFC3986(v)}`)
    .join('&');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = createHmac('sha256', signingKey(cfg.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function r2PutObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  options?: { cacheControl?: string }
): Promise<{ sha256: string; etag?: string; size: number }> {
  const sha256 = sha256Hex(body);
  const res = await r2SignedFetch('PUT', key, {
    body,
    contentType,
    cacheControl: options?.cacheControl,
  });
  if (!res.ok) {
    throw new HttpError(502, `Không thể lưu tệp vào Cloudflare R2 (HTTP ${res.status}).`);
  }
  const etag = res.headers.get('etag')?.replace(/"/g, '') || undefined;
  return { sha256, etag, size: body.byteLength };
}

export async function r2HeadObject(key: string): Promise<R2ObjectHead> {
  const res = await r2SignedFetch('HEAD', key);
  if (res.status === 404) {
    throw new HttpError(404, 'Tệp chưa tồn tại trên Cloudflare R2.');
  }
  if (!res.ok) {
    throw new HttpError(502, `Không thể kiểm tra tệp trên Cloudflare R2 (HTTP ${res.status}).`);
  }
  const size = Number(res.headers.get('content-length') || '0');
  const contentType = (res.headers.get('content-type') || 'application/octet-stream')
    .split(';')[0]
    .trim()
    .toLowerCase();
  return {
    size,
    contentType,
    etag: res.headers.get('etag')?.replace(/"/g, '') || undefined,
    lastModified: res.headers.get('last-modified') || undefined,
    acceptRanges: res.headers.get('accept-ranges') || 'bytes',
  };
}

export async function r2Exists(key: string): Promise<boolean> {
  const res = await r2SignedFetch('HEAD', key, { retries: 1 });
  return res.ok;
}

export async function r2GetObject(key: string, options?: { range?: string }): Promise<Response | null> {
  const res = await r2SignedFetch('GET', key, { range: options?.range });
  if ((res.status !== 200 && res.status !== 206) || !res.body) return null;
  return res;
}

export async function r2DeleteObjects(keys: string[]): Promise<number> {
  if (!keys.length) return 0;
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 10) {
    const chunk = keys.slice(i, i + 10);
    await Promise.all(
      chunk.map(async (k) => {
        const res = await r2SignedFetch('DELETE', k);
        if (res.ok || res.status === 204 || res.status === 404) deleted += 1;
      })
    );
  }
  return deleted;
}
