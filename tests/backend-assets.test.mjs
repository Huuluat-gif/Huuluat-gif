import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { after, beforeEach, test } from 'node:test';
import { build } from 'esbuild';

// Exercise the actual route wrappers and Blob client SDK (including HMAC
// generation/verification). Replace only persistence, session lookup and Blob
// control-plane I/O. These tests never load .env files or contact live services.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(root, 'tests/.backend-assets-'));
const apiPath = path.join(root, 'lib/api.ts');
const fakeToken = 'vercel_blob_rw_teststore_not-a-real-credential';
const previousToken = process.env.BLOB_READ_WRITE_TOKEN;
const previousStore = process.env.BLOB_STORE_ID;
const previousCallback = process.env.VERCEL_BLOB_CALLBACK_URL;
const previousFetch = globalThis.fetch;
process.env.BLOB_READ_WRITE_TOKEN = fakeToken;
process.env.BLOB_STORE_ID = 'store_differentstore';
process.env.VERCEL_BLOB_CALLBACK_URL = 'https://lowf.test';
globalThis.fetch = async () => { throw new Error('Unexpected network access in asset regression tests'); };

await build({
  stdin: {
    contents: `export * as assets from './lib/assets';
      export { POST as upload } from './app/api/uploads/route';
      export { POST as finalize } from './app/api/uploads/finalize/route';
      export { GET as read } from './app/api/assets/[id]/route';
      export { getPayloadFromClientToken } from '@vercel/blob/client';`,
    resolveDir: root, loader: 'ts',
  },
  outfile: path.join(temporary, 'routes.cjs'),
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
  plugins: [{
    name: 'in-memory-boundaries',
    setup(builder) {
      builder.onResolve({ filter: /^@vercel\/blob$/ }, () => ({ path: 'blob', namespace: 'test-boundary' }));
      builder.onResolve({ filter: /^(?:@\/lib\/|\.\/)(?:db|auth\/server|membership)$/ }, ({ path: imported }) => ({ path: imported.split('/').at(-1), namespace: 'test-boundary' }));
      builder.onLoad({ filter: /.*/, namespace: 'test-boundary' }, ({ path: name }) => {
        const state = 'const state = () => globalThis.__lowfAssetTestState;';
        const implementations = {
          db: `${state}
            export function getSQL() { return async (strings, ...values) => {
              const query = strings.join('?'); const current = state();
              current.queries.push({ query, values });
              if (query.includes('lowf_rate_limits')) return [{ hits: current.rateHits }];
              if (query.includes('INSERT INTO lowf_assets')) {
                const [id, owner_id, pathname, kind, content_type, byte_size, original_name] = values;
                const existing = [...current.assets.values()].find(asset => asset.pathname === pathname);
                if (existing) return existing.owner_id === owner_id && existing.kind === kind ? [existing] : [];
                const row = { id, owner_id, pathname, kind, content_type, byte_size, original_name };
                current.assets.set(id, row); return [row];
              }
              if (query.includes('FROM lowf_assets')) { const row = current.assets.get(values[0]); return row ? [row] : []; }
              if (query.includes('lowf_design_versions')) return current.designs.filter(row => row.status === 'published' && row.settings.hero?.imageAssetId === values[0]);
              if (query.includes('FROM lowf_content')) return current.content.filter(row => row.status === 'published' && ['coverAssetId', 'pdfAssetId', 'assetId'].some(key => row.data[key] === values[0])).map(row => ({ access: row.data.access, cover_id: row.data.coverAssetId }));
              throw new Error('Unexpected query in asset test');
            }; }
          `,
          server: `import { HttpError } from ${JSON.stringify(apiPath)}; ${state}
            export async function getUser() { return state().user; }
            export async function requireAdmin() {
              const user = state().user;
              if (!user) throw new HttpError(401, 'Login required');
              if (!user.isAdmin) throw new HttpError(403, 'Admin required');
              return user;
            }`,
          membership: `${state} export async function hasMembership(id) { state().membershipChecks.push(id); return state().member; }`,
          blob: `${state}
            export async function head(pathname, options) { state().heads.push({ pathname, options }); return state().metadata; }
            export async function issueSignedToken(options) { state().issued.push(options); return { delegationToken: 'test-delegation', clientSigningToken: 'test-signing-token', validUntil: options.validUntil }; }
            export async function presignUrl(token, options) { state().presigned.push({ token, options }); return { presignedUrl: 'https://teststore.private.blob.vercel-storage.com/' + options.pathname + '?signed=test' }; }`,
        };
        return { contents: implementations[name], loader: 'js', resolveDir: root };
      });
    },
  }],
});

const routes = createRequire(import.meta.url)(path.join(temporary, 'routes.cjs'));
const owner = { id: 'owner-123', name: 'Owner', email: 'owner@example.test', emailVerified: true, isAdmin: true };
const reader = { id: 'reader-456', name: 'Reader', email: 'reader@example.test', emailVerified: true, isAdmin: false };
const assetId = 'a1b2c3d4-1111-4111-8111-1234567890ab';
const uploadId = '12345678-1234-4234-8234-123456789abc';
const pathname = `lowf/${owner.id}/pdf/${uploadId}.pdf`;
const blobURL = `https://teststore.private.blob.vercel-storage.com/${pathname}`;
let state;

beforeEach(() => {
  state = {
    user: owner, member: false, rateHits: 1, assets: new Map(), content: [], designs: [],
    heads: [], issued: [], presigned: [], queries: [], membershipChecks: [],
    metadata: { url: blobURL, pathname, contentType: 'application/pdf', size: 2048 },
  };
  globalThis.__lowfAssetTestState = state;
});

after(async () => {
  if (previousToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = previousToken;
  if (previousStore === undefined) delete process.env.BLOB_STORE_ID; else process.env.BLOB_STORE_ID = previousStore;
  if (previousCallback === undefined) delete process.env.VERCEL_BLOB_CALLBACK_URL; else process.env.VERCEL_BLOB_CALLBACK_URL = previousCallback;
  globalThis.fetch = previousFetch;
  delete globalThis.__lowfAssetTestState;
  await rm(temporary, { recursive: true, force: true });
});

function request(endpoint, body, headers = {}) {
  return new Request(`https://lowf.test${endpoint}`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://lowf.test', ...headers },
    body: JSON.stringify(body),
  });
}
function tokenRequest(overrides = {}) {
  return { type: 'blob.generate-client-token', payload: { pathname, multipart: false, clientPayload: JSON.stringify({ kind: 'pdf', title: 'My book.pdf' }), ...overrides } };
}
function seedAsset(overrides = {}) {
  const row = { id: assetId, owner_id: owner.id, pathname, kind: 'pdf', content_type: 'application/pdf', byte_size: 2048, original_name: 'My book.pdf', ...overrides };
  state.assets.set(row.id, row); return row;
}
function callbackBody() {
  // Intentionally non-schema key order and extra SDK metadata. HMAC verification
  // must cover the original body, not a reconstructed/stripped Zod result.
  return { payload: { tokenPayload: JSON.stringify({ kind: 'pdf', ownerId: owner.id, originalName: 'My book.pdf' }), blob: { pathname, url: blobURL, contentType: 'application/pdf', downloadUrl: `${blobURL}?download=1`, contentDisposition: 'inline', etag: 'example' } }, type: 'blob.upload-completed' };
}
function callbackRequest(body, signature = createHmac('sha256', fakeToken).update(JSON.stringify(body)).digest('hex')) {
  return new Request('https://lowf.test/api/uploads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-vercel-signature': signature }, body: JSON.stringify(body) });
}
function expectHttpStatus(status) { return error => error.status === status; }

test('upload tokens require an authenticated admin and a same-origin request', async () => {
  state.user = null;
  assert.equal((await routes.upload(request('/api/uploads', tokenRequest()))).status, 401);
  state.user = reader;
  assert.equal((await routes.upload(request('/api/uploads', tokenRequest()))).status, 403);
  state.user = owner;
  assert.equal((await routes.upload(request('/api/uploads', tokenRequest(), { origin: 'https://attacker.test' }))).status, 403);
  assert.equal(state.queries.length, 0);
  assert.equal(state.heads.length, 0);
});

test('real SDK upload grants bind owner, pathname, MIME types, size, expiry and no overwrite', async () => {
  for (const [kind, extension, bytes, mime] of [
    ['image', 'webp', 5 * 1024 ** 2, 'image/webp'],
    ['pdf', 'pdf', 50 * 1024 ** 2, 'application/pdf'],
    ['audio', 'mp3', 50 * 1024 ** 2, 'audio/mpeg'],
    ['video', 'mp4', 250 * 1024 ** 2, 'video/mp4'],
  ]) {
    const key = `lowf/${owner.id}/${kind}/${uploadId}.${extension}`;
    const before = Date.now();
    const response = await routes.upload(request('/api/uploads', tokenRequest({ pathname: key, multipart: kind === 'video', clientPayload: JSON.stringify({ kind, title: 'a'.repeat(250) + '.' + extension, ownerId: reader.id }) })));
    assert.equal(response.status, 200);
    const result = await response.json();
    const grant = routes.getPayloadFromClientToken(result.clientToken);
    assert.equal(grant.pathname, key);
    assert.equal(grant.maximumSizeInBytes, bytes);
    assert.ok(grant.allowedContentTypes.includes(mime));
    assert.equal(grant.allowOverwrite, false);
    assert.equal(grant.addRandomSuffix, false);
    assert.ok(grant.validUntil >= before + 14 * 60 * 1000 && grant.validUntil <= Date.now() + 15 * 60 * 1000);
    const callback = JSON.parse(grant.onUploadCompleted.tokenPayload);
    assert.equal(callback.ownerId, owner.id);
    assert.equal(callback.kind, kind);
    assert.equal(callback.originalName.length, 180);
  }
  assert.equal(state.heads.length, 0);
});

test('foreign upload prefixes, traversal, executable images and rate limits are rejected', async () => {
  for (const key of [pathname.replace(owner.id, reader.id), `lowf/${owner.id}/pdf/../${uploadId}.pdf`, `lowf/${owner.id}/pdf/${uploadId}.html`]) {
    const response = await routes.upload(request('/api/uploads', tokenRequest({ pathname: key })));
    assert.ok([400, 403].includes(response.status));
  }
  assert.throws(() => routes.assets.assertAssetPath(`lowf/${owner.id}/image/${uploadId}.svg`, owner.id, 'image'), expectHttpStatus(400));
  state.rateHits = 61;
  assert.equal((await routes.upload(request('/api/uploads', tokenRequest()))).status, 429);
});

test('real SDK accepts a signed callback without session/Origin and finalize is idempotent', async () => {
  state.user = null;
  const callback = callbackBody();
  const response = await routes.upload(callbackRequest(callback));
  assert.equal(response.status, 200);
  assert.equal(state.assets.size, 1);
  const [first] = state.assets.values();
  state.user = owner;
  const finalized = await routes.finalize(request('/api/uploads/finalize', { url: blobURL, kind: 'pdf', originalName: 'b'.repeat(250) + '.pdf' }));
  assert.equal(finalized.status, 201);
  assert.equal((await finalized.json()).asset.id, first.id);
  assert.equal(state.assets.size, 1);
  assert.ok(state.heads.every(call => call.options.token === fakeToken));
});

test('tampered, missing and malformed callback signatures cannot reach Blob or the database', async () => {
  const body = callbackBody();
  for (const signature of ['', 'a', 'g'.repeat(64), '0'.repeat(64)]) {
    assert.equal((await routes.upload(callbackRequest(body, signature))).status, 403);
  }
  const signature = createHmac('sha256', fakeToken).update(JSON.stringify(body)).digest('hex');
  body.payload.tokenPayload = JSON.stringify({ kind: 'pdf', ownerId: reader.id });
  assert.equal((await routes.upload(callbackRequest(body, signature))).status, 403);
  assert.equal(state.heads.length, 0);
  assert.equal(state.queries.length, 0);
});

test('finalization rejects foreign, public, credentialed or query URLs before storage I/O', async () => {
  for (const url of [
    'https://attacker.test/file.pdf', 'http://127.0.0.1/file.pdf',
    blobURL.replace('teststore.private', 'differentstore.private'),
    blobURL.replace('teststore.private', 'teststore.public'),
    blobURL.replace('https://', 'https://user:password@'),
    `${blobURL}?download=1`, `${blobURL}#fragment`,
    blobURL.replace(owner.id, reader.id),
  ]) {
    const response = await routes.finalize(request('/api/uploads/finalize', { url, kind: 'pdf' }));
    assert.ok([400, 403].includes(response.status));
  }
  assert.equal(state.heads.length, 0);
  assert.equal(state.assets.size, 0);
  // The upload token's store takes priority over an unrelated OIDC store env.
  assert.equal(routes.assets.validatePrivateBlobURL(blobURL).hostname, 'teststore.private.blob.vercel-storage.com');
});

test('finalization enforces storage metadata MIME, nonempty size, maximum size and exact path', async () => {
  for (const changes of [{ contentType: 'text/html' }, { size: 0 }, { size: -1 }, { size: 2.5 }, { size: 50 * 1024 ** 2 + 1 }, { pathname: 'other.pdf' }, { url: blobURL.replace('teststore.', 'otherstore.') }]) {
    state.metadata = { url: blobURL, pathname, contentType: 'application/pdf', size: 100, ...changes };
    await assert.rejects(routes.assets.finalizeAsset({ url: blobURL, kind: 'pdf', ownerId: owner.id }), expectHttpStatus(400));
  }
  assert.equal(state.assets.size, 0);
  state.metadata = { url: blobURL, pathname, contentType: 'application/pdf; charset=binary', size: 50 * 1024 ** 2 };
  const result = await routes.assets.finalizeAsset({ url: blobURL, kind: 'pdf', ownerId: owner.id, originalName: '../Book\u0000.pdf' });
  assert.equal(result.originalName, '..Book.pdf');
  assert.equal(result.size, 50 * 1024 ** 2);
});

test('finalize cannot be used by non-admins or across origins', async () => {
  const body = { url: blobURL, kind: 'pdf' };
  state.user = null;
  assert.equal((await routes.finalize(request('/api/uploads/finalize', body))).status, 401);
  state.user = reader;
  assert.equal((await routes.finalize(request('/api/uploads/finalize', body))).status, 403);
  state.user = owner;
  assert.equal((await routes.finalize(request('/api/uploads/finalize', body, { origin: 'https://attacker.test' }))).status, 403);
  assert.equal(state.heads.length, 0);
});

test('only published free assets and covers are readable anonymously', async () => {
  state.user = null;
  seedAsset();
  state.content = [{ status: 'draft', data: { pdfAssetId: assetId, access: 'free' } }];
  await assert.rejects(routes.assets.authorizeAssetRead(assetId), expectHttpStatus(401));
  state.content[0].status = 'published';
  assert.equal((await routes.assets.authorizeAssetRead(assetId.toUpperCase())).id, assetId);
  state.content[0].data.access = 'member';
  await assert.rejects(routes.assets.authorizeAssetRead(assetId), expectHttpStatus(401));
  seedAsset({ kind: 'image', content_type: 'image/webp' });
  state.content = [{ status: 'published', data: { coverAssetId: assetId, access: 'member' } }];
  assert.equal((await routes.assets.authorizeAssetRead(assetId)).id, assetId);
});

test('members cannot read drafts or unreferenced files, while owner/admin can', async () => {
  seedAsset();
  state.user = reader;
  state.member = true;
  state.content = [{ status: 'draft', data: { pdfAssetId: assetId, access: 'member' } }];
  await assert.rejects(routes.assets.authorizeAssetRead(assetId), expectHttpStatus(403));
  state.content[0].status = 'published';
  assert.equal((await routes.assets.authorizeAssetRead(assetId)).id, assetId);
  state.member = false;
  await assert.rejects(routes.assets.authorizeAssetRead(assetId), expectHttpStatus(403));
  state.content = [];
  state.user = { ...owner, isAdmin: false };
  assert.equal((await routes.assets.authorizeAssetRead(assetId)).id, assetId);
  state.user = { ...reader, isAdmin: true };
  assert.equal((await routes.assets.authorizeAssetRead(assetId)).id, assetId);
});

test('only published hero images become public through design versions', async () => {
  state.user = null;
  seedAsset({ kind: 'image' });
  state.designs = [{ status: 'draft', settings: { hero: { imageAssetId: assetId } } }];
  await assert.rejects(routes.assets.authorizeAssetRead(assetId), expectHttpStatus(401));
  state.designs[0].status = 'published';
  assert.equal((await routes.assets.authorizeAssetRead(assetId)).id, assetId);
  seedAsset({ kind: 'pdf' });
  await assert.rejects(routes.assets.authorizeAssetRead(assetId), expectHttpStatus(401));
});

test('read redirects issue a single-path, read-only, five-minute private URL with no caching', async () => {
  seedAsset();
  const before = Date.now();
  const response = await routes.read(new Request(`https://lowf.test/api/assets/${assetId}`), { params: Promise.resolve({ id: assetId }) });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(response.headers.get('vary'), 'Cookie');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.ok(response.headers.get('location').startsWith(blobURL));
  const [grant] = state.issued;
  assert.equal(grant.pathname, pathname);
  assert.deepEqual(grant.operations, ['get']);
  assert.equal(grant.token, fakeToken);
  assert.ok(grant.validUntil >= before + 299_000 && grant.validUntil <= Date.now() + 300_000);
  assert.equal(state.presigned[0].options.access, 'private');
  assert.equal(state.presigned[0].options.validUntil, grant.validUntil);
});

test('unknown assets and denied reads never mint signed URLs', async () => {
  state.user = null;
  for (const id of ['not-a-uuid', assetId]) {
    assert.equal((await routes.read(new Request('https://lowf.test/api/assets/example'), { params: Promise.resolve({ id }) })).status, 404);
  }
  seedAsset();
  assert.equal((await routes.read(new Request('https://lowf.test/api/assets/example'), { params: Promise.resolve({ id: assetId }) })).status, 401);
  assert.equal(state.issued.length, 0);
});
