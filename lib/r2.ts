import { createHash, createHmac } from 'node:crypto';
import { HttpError } from './api';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function getR2Config(): R2Config | null {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (
    process.env.VERCEL_ENV === 'preview'
      ? (process.env.R2_PREVIEW_BUCKET || process.env.R2_BUCKET || '')
      : (process.env.R2_BUCKET || '')
  ).trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export function isR2Path(pathname: string): boolean {
  return pathname.startsWith('r2/');
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

function sha256Hex(data: string | Uint8Array): string {
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

async function r2SignedFetch(
  method: 'GET' | 'HEAD' | 'PUT' | 'DELETE',
  key: string,
  options?: { body?: Buffer; contentType?: string }
): Promise<Response> {
  const cfg = requireR2();
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = encodeKeyPath(cfg.bucket, key);
  const { amzDate, dateStamp } = amzTimestamps();
  const body = options?.body;
  const payloadHash = sha256Hex(body ?? '');

  const headersToSign: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (options?.contentType) {
    headersToSign['content-type'] = options.contentType;
  }
  const sortedNames = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedNames.map((k) => `${k}:${headersToSign[k]}\n`).join('');
  const signedHeaders = sortedNames.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    '',
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
  if (options?.contentType) {
    reqHeaders['Content-Type'] = options.contentType;
  }

  return fetch(`https://${host}${canonicalUri}`, {
    method,
    headers: reqHeaders,
    body: body ? new Uint8Array(body) : undefined,
    cache: 'no-store',
  });
}

export function r2PresignUrl(
  method: 'GET' | 'PUT',
  key: string,
  expiresSeconds = 300
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

export async function r2PutObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const res = await r2SignedFetch('PUT', key, { body, contentType });
  if (!res.ok) {
    throw new HttpError(502, `Không thể lưu tệp vào Cloudflare R2 (HTTP ${res.status}).`);
  }
}

export async function r2HeadObject(key: string): Promise<{ size: number; contentType: string }> {
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
  return { size, contentType };
}

export async function r2GetObject(key: string): Promise<Response | null> {
  const res = await r2SignedFetch('GET', key);
  if (!res.ok || !res.body) return null;
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
