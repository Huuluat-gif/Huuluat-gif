import { del as delBlob, get as getBlob, head as headBlob, issueSignedToken, presignUrl, put as putBlob } from '@vercel/blob';
import { blobCredentials } from './blob-config';
import {
  isR2Configured,
  isR2Path,
  r2DeleteObjects,
  r2Exists,
  r2GetObject,
  r2HeadObject,
  r2PresignUrl,
  r2PutObject,
  sha256Hex,
} from './r2';

export type StorageBackend = 'r2' | 'vercel-blob';

export interface StoredObjectMeta {
  backend: StorageBackend;
  key: string;
  size: number;
  contentType: string;
  etag?: string;
}

export interface StoragePutResult {
  backend: StorageBackend;
  key: string;
  size: number;
  sha256: string;
  etag?: string;
}

/**
 * Provider-agnostic object storage abstraction for Lowf Library.
 * Routes all new writes to Cloudflare R2 when configured while preserving
 * transparent read/migration compatibility with legacy Vercel Blob objects.
 */
export function activeStorageBackend(): StorageBackend {
  return isR2Configured() ? 'r2' : 'vercel-blob';
}

export function backendForKey(key: string): StorageBackend {
  return isR2Path(key) ? 'r2' : 'vercel-blob';
}

export async function storagePut(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  options?: { cacheControl?: string }
): Promise<StoragePutResult> {
  const sha256 = sha256Hex(body);
  if (isR2Path(key) || isR2Configured()) {
    const finalKey = isR2Path(key) ? key : `r2/${key.replace(/^\/+/, '')}`;
    const res = await r2PutObject(finalKey, body, contentType, options);
    return { backend: 'r2', key: finalKey, size: res.size, sha256: res.sha256, etag: res.etag };
  }
  await putBlob(key, Buffer.from(body), {
    access: 'private',
    contentType,
    addRandomSuffix: false,
    ...blobCredentials(),
  });
  return { backend: 'vercel-blob', key, size: body.byteLength, sha256 };
}

export async function storageHead(key: string): Promise<StoredObjectMeta> {
  if (isR2Path(key)) {
    const meta = await r2HeadObject(key);
    return { backend: 'r2', key, size: meta.size, contentType: meta.contentType, etag: meta.etag };
  }
  const meta = await headBlob(key, blobCredentials());
  return {
    backend: 'vercel-blob',
    key: meta.pathname,
    size: meta.size,
    contentType: meta.contentType.split(';')[0].trim().toLowerCase(),
  };
}

export async function storageExists(key: string): Promise<boolean> {
  if (isR2Path(key)) return r2Exists(key);
  try {
    await headBlob(key, blobCredentials());
    return true;
  } catch {
    return false;
  }
}

export async function storageStream(
  key: string,
  options?: { range?: string }
): Promise<{ status: number; body: ReadableStream<Uint8Array>; headers: Headers } | null> {
  if (isR2Path(key)) {
    const res = await r2GetObject(key, { range: options?.range });
    if (!res || !res.body) return null;
    return { status: res.status, body: res.body, headers: res.headers };
  }
  const result = await getBlob(key, { access: 'private', ...blobCredentials() });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const headers = new Headers();
  if (result.blob?.contentType) headers.set('Content-Type', result.blob.contentType);
  if (result.blob?.size) headers.set('Content-Length', String(result.blob.size));
  return { status: 200, body: result.stream, headers };
}

export async function storageSignedGetUrl(key: string, expiresSeconds = 300): Promise<string> {
  if (isR2Path(key)) {
    return r2PresignUrl('GET', key, expiresSeconds);
  }
  const validUntil = Date.now() + expiresSeconds * 1000;
  const token = await issueSignedToken({
    ...blobCredentials(),
    pathname: key,
    operations: ['get'],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(token, {
    operation: 'get',
    pathname: key,
    access: 'private',
    validUntil,
  });
  return presignedUrl;
}

export function storageSignedPutUrl(key: string, expiresSeconds = 900): string {
  return r2PresignUrl('PUT', key, expiresSeconds);
}

export async function storageDeleteKeys(keys: string[]): Promise<number> {
  const r2Keys = keys.filter((k) => isR2Path(k));
  const blobKeys = keys.filter((k) => !isR2Path(k));
  let deleted = 0;
  if (r2Keys.length && isR2Configured()) {
    deleted += await r2DeleteObjects(r2Keys);
  }
  if (blobKeys.length) {
    const creds = blobCredentials();
    for (let i = 0; i < blobKeys.length; i += 100) {
      const batch = blobKeys.slice(i, i + 100);
      await delBlob(batch, creds);
      deleted += batch.length;
    }
  }
  return deleted;
}
