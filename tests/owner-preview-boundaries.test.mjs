import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, beforeEach, test } from 'node:test';
import { build } from 'esbuild';

// The real server page, route guards and credential selectors run here. Replace
// only framework navigation, the client Studio boundary and service I/O. These
// tests load no .env file and fail if any unexpected network request is made.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(root, 'tests/.owner-preview-'));
const require = createRequire(import.meta.url);
const credentialFile = path.join(temporary, 'credentials.cjs');
const routesFile = path.join(temporary, 'routes.cjs');
const previousFetch = globalThis.fetch;
const envNames = ['VERCEL_ENV', 'DATABASE_URL', 'LOWF_PREVIEW_DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'LOWF_PREVIEW_READ_WRITE_TOKEN', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_COOKIE_SECRET', 'LOWF_PREVIEW_AUTH_COOKIE_SECRET'];
const previousEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
const fixture = {
  productionDB: 'postgresql://fixture:unused@production.invalid/database',
  previewDB: 'postgresql://fixture:unused@preview.invalid/database',
  productionBlob: 'production-blob-fixture-never-use',
  previewBlob: 'preview-blob-fixture-never-use',
  productionSecret: 'production-cookie-secret-fixture-at-least-32-characters',
  previewSecret: 'preview-cookie-secret-fixture-at-least-32-characters',
};
globalThis.fetch = async () => { throw new Error('Unexpected network call in owner/preview boundary test'); };

await build({
  stdin: { contents: `export { getSQL } from './lib/db'; export { blobToken,blobCredentials } from './lib/blob-config'; export { getAuth } from './lib/auth/server';`, resolveDir: root, loader: 'ts' },
  outfile: credentialFile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
  plugins: [{ name: 'credential-service-boundaries', setup(builder) {
    builder.onResolve({ filter: /^@neondatabase\/serverless$|^@neon\/auth\/next\/server$/ }, args => ({ path: args.path, namespace: 'credential-boundary' }));
    builder.onLoad({ filter: /.*/, namespace: 'credential-boundary' }, args => ({ loader: 'js', contents: args.path === '@neondatabase/serverless'
      ? `export function neon(url){globalThis.__lowfOwnerPreviewState.neonCalls.push(url);return Object.assign(()=>{throw Error('Unexpected SQL execution')},{selectedURL:url});}`
      : `export function createNeonAuth(options){globalThis.__lowfOwnerPreviewState.authCalls.push(options);return {fixtureOptions:options};}` }));
  } }],
});

await build({
  stdin: { contents: `export {default as AdminPage} from './app/admin/page'; export {GET as guide} from './app/huong-dan.html/route'; export {GET as bootstrap} from './app/api/bootstrap/route';`, resolveDir: root, loader: 'tsx' },
  outfile: routesFile, bundle: true, platform: 'node', format: 'cjs', packages: 'external', logLevel: 'silent',
  plugins: [{ name: 'owner-route-boundaries', setup(builder) {
    builder.onResolve({ filter: /^(?:@\/lib\/(?:auth\/server|db|membership|commerce|content|validation)|next\/navigation|node:fs\/promises|react\/jsx-runtime|\.\/studio)$/ }, args => ({ path: args.path, namespace: 'owner-boundary' }));
    builder.onLoad({ filter: /.*/, namespace: 'owner-boundary' }, args => {
      const prefix = `const state=()=>globalThis.__lowfOwnerPreviewState;`;
      const implementations = {
        '@/lib/auth/server': `export async function getUser(){state().userChecks++;return state().user;}`,
        '@/lib/db': `export function getSQL(){state().dbFactories++;return async(strings,...values)=>{const query=strings.join('?');state().queries.push({query,values});if(query.includes('lowf_content'))return state().content;if(query.includes('lowf_design_versions'))return [{status:query.includes("'draft'")?'draft':'published',settings:{fixtureDesign:query.includes("'draft'")?'draft':'published'}}];throw Error('Unexpected SQL query');};}`,
        '@/lib/membership': `export async function hasMembership(){state().membershipCalls++;return false;}`,
        '@/lib/commerce': `export async function getCommerceStatus(){state().commerceCalls++;return {enabled:false};} export async function getPurchasedBookIds(){state().purchaseCalls++;return [];}`,
        '@/lib/content': `export function publicItem(row){return {id:row.id,status:row.status,...row.data};}`,
        '@/lib/validation': `export const defaultDesign={fixtureDesign:'default'};`,
        'next/navigation': `export function redirect(location){const error=Object.assign(new Error('redirect'),{kind:'redirect',location});throw error;} export function notFound(){throw Object.assign(new Error('not found'),{kind:'notFound'});}`,
        'node:fs/promises': `export async function readFile(filename,encoding){state().fileReads.push({filename,encoding});return '<html>PRIVATE OWNER GUIDE FIXTURE</html>';}`,
        './studio': `export default function AdminStudio(){throw Error('Client Studio must not execute during server guard test');}`,
        'react/jsx-runtime': `export function jsx(type,props){state().studioElements++;return {type,props};} export const jsxs=jsx;`,
      };
      return { contents: prefix + implementations[args.path], loader: 'js', resolveDir: root };
    });
  } }],
});

const routes = require(routesFile);
const owner = { id: 'owner-fixture', email: 'owner@example.test', name: 'Owner', emailVerified: true, isAdmin: true };
const reader = { id: 'reader-fixture', email: 'reader@example.test', name: 'Reader', emailVerified: true, isAdmin: false };
let state;
beforeEach(() => {
  state = { user: null, userChecks: 0, neonCalls: [], authCalls: [], dbFactories: 0, queries: [], membershipCalls: 0, commerceCalls: 0, purchaseCalls: 0, fileReads: [], studioElements: 0, content: [] };
  globalThis.__lowfOwnerPreviewState = state;
  for (const name of envNames) delete process.env[name];
  process.env.DATABASE_URL = fixture.productionDB;
  process.env.BLOB_READ_WRITE_TOKEN = fixture.productionBlob;
  process.env.NEON_AUTH_BASE_URL = 'https://auth-fixture.invalid/auth';
  process.env.NEON_AUTH_COOKIE_SECRET = fixture.productionSecret;
  // Reset the real module-scoped database/auth singletons for each environment.
  delete require.cache[credentialFile];
});
after(async () => {
  for (const [name, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  globalThis.fetch = previousFetch;
  delete globalThis.__lowfOwnerPreviewState;
  await rm(temporary, { recursive: true, force: true });
});
const admin = params => routes.AdminPage({ searchParams: Promise.resolve(params || {}) });
const bootstrap = query => routes.bootstrap(new Request(`https://lowf.example/api/bootstrap${query || ''}`));
function assertNoDataIO() {
  assert.equal(state.dbFactories, 0);
  assert.equal(state.queries.length, 0);
  assert.equal(state.membershipCalls, 0);
  assert.equal(state.commerceCalls, 0);
  assert.equal(state.purchaseCalls, 0);
}

test('preview database refuses to fall back to an available production connection', () => {
  process.env.VERCEL_ENV = 'preview';
  assert.throws(() => require(credentialFile).getSQL(), /Isolated preview database is not configured/);
  assert.deepEqual(state.neonCalls, []);
});
test('preview Blob refuses to fall back to an available production token', () => {
  process.env.VERCEL_ENV = 'preview';
  assert.throws(() => require(credentialFile).blobToken(), error => error.status === 503);
  assert.throws(() => require(credentialFile).blobCredentials(), error => error.status === 503);
});
test('preview authentication refuses an absent or short isolated cookie secret', () => {
  process.env.VERCEL_ENV = 'preview';
  const credentials = require(credentialFile);
  assert.throws(() => credentials.getAuth(), /Authentication is not configured/);
  process.env.LOWF_PREVIEW_AUTH_COOKIE_SECRET = 'too-short';
  assert.throws(() => credentials.getAuth(), /Authentication is not configured/);
  assert.deepEqual(state.authCalls, []);
});
test('configured preview selects only the isolated database, Blob token and cookie secret', () => {
  process.env.VERCEL_ENV = 'preview';
  process.env.LOWF_PREVIEW_DATABASE_URL = fixture.previewDB;
  process.env.LOWF_PREVIEW_READ_WRITE_TOKEN = fixture.previewBlob;
  process.env.LOWF_PREVIEW_AUTH_COOKIE_SECRET = fixture.previewSecret;
  const credentials = require(credentialFile);
  assert.equal(credentials.getSQL().selectedURL, fixture.previewDB);
  assert.equal(credentials.blobCredentials().token, fixture.previewBlob);
  assert.equal(credentials.getAuth().fixtureOptions.cookies.secret, fixture.previewSecret);
  assert.deepEqual(state.neonCalls, [fixture.previewDB]);
  assert.equal(state.authCalls.length, 1);
});
test('production continues selecting production resources when preview variables also exist', () => {
  process.env.VERCEL_ENV = 'production';
  process.env.LOWF_PREVIEW_DATABASE_URL = fixture.previewDB;
  process.env.LOWF_PREVIEW_READ_WRITE_TOKEN = fixture.previewBlob;
  process.env.LOWF_PREVIEW_AUTH_COOKIE_SECRET = fixture.previewSecret;
  const credentials = require(credentialFile);
  assert.equal(credentials.getSQL().selectedURL, fixture.productionDB);
  assert.equal(credentials.blobToken(), fixture.productionBlob);
  assert.equal(credentials.getAuth().fixtureOptions.cookies.secret, fixture.productionSecret);
});

test('guest admin request redirects to login with the validated book-editor destination', async () => {
  await assert.rejects(admin({ tab: 'books', action: 'new', next: 'https://attacker.invalid', arbitrary: 'secret' }), error => error.kind === 'redirect' && error.location === '/?auth=login&next=%2Fadmin%3Ftab%3Dbooks%26action%3Dadd');
  assert.equal(state.studioElements, 0); assertNoDataIO();
});
test('malicious or array-valued admin query parameters never become an external return destination', async () => {
  await assert.rejects(admin({ tab: ['books', 'payments'], action: 'https://attacker.invalid', next: '//attacker.invalid' }), error => error.kind === 'redirect' && error.location === '/?auth=login&next=%2Fadmin');
  assert.equal(state.studioElements, 0); assertNoDataIO();
});
test('unverified account is sent to code verification without constructing the owner Studio', async () => {
  state.user = { ...reader, emailVerified: false };
  await assert.rejects(admin({ tab: 'payments' }), error => error.kind === 'redirect' && error.location === '/?auth=verify&next=%2Fadmin%3Ftab%3Dpayments');
  assert.equal(state.studioElements, 0); assertNoDataIO();
});
test('verified ordinary reader receives not-found and no owner Studio element', async () => {
  state.user = reader;
  await assert.rejects(admin(), error => error.kind === 'notFound');
  assert.equal(state.studioElements, 0); assertNoDataIO();
});
test('verified owner alone receives the Studio with the actual deployment environment', async () => {
  state.user = owner; process.env.VERCEL_ENV = 'preview';
  const preview = await admin({ tab: 'design' });
  assert.equal(preview.type.name, 'AdminStudio'); assert.equal(preview.props.environment, 'preview');
  process.env.VERCEL_ENV = 'production';
  assert.equal((await admin()).props.environment, 'production');
  assert.equal(state.studioElements, 2); assertNoDataIO();
});

test('owner guide redirects guests and rejects all nonowners before reading the private file', async () => {
  const request = new Request('https://lowf.example/huong-dan.html');
  let response = await routes.guide(request);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://lowf.example/?auth=login&next=%2Fadmin');
  for (const user of [reader, { ...reader, emailVerified: false }]) {
    state.user = user; response = await routes.guide(request);
    assert.equal(response.status, 404); assert.ok(!(await response.text()).includes('PRIVATE OWNER GUIDE'));
  }
  assert.equal(state.fileReads.length, 0);
});
test('owner guide is served privately with no cache or search indexing', async () => {
  state.user = owner;
  const response = await routes.guide(new Request('https://lowf.example/huong-dan.html'));
  assert.equal(response.status, 200); assert.ok((await response.text()).includes('PRIVATE OWNER GUIDE'));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(state.fileReads.length, 1);
  assert.equal(state.fileReads[0].filename, path.join(process.cwd(), 'lib/admin/owner-guide.html'));
});

test('draft design requests reject guests and ordinary readers before any database or membership access', async () => {
  for (const user of [null, reader, { ...reader, emailVerified: false }]) {
    state.user = user;
    const response = await bootstrap('?designPreview=1');
    assert.equal(response.status, user ? 403 : 401);
    assertNoDataIO();
    assert.ok(!(await response.text()).includes('fixtureDesign'));
  }
});
test('ordinary public bootstrap exposes published design only and no owner environment metadata', async () => {
  for (const user of [null, reader]) {
    state.user = user;
    const response = await bootstrap(); const body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.settings.fixtureDesign, 'published');
    assert.equal('environment' in body, false); assert.equal('designPreview' in body, false);
  }
  assert.ok(state.queries.filter(item => item.query.includes('lowf_design_versions')).every(item => !item.query.includes("'draft'")));
});
test('owner can preview draft design while published requests continue returning published design', async () => {
  state.user = owner; process.env.VERCEL_ENV = 'preview';
  let response = await bootstrap('?designPreview=1'); let body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.settings.fixtureDesign, 'draft'); assert.equal(body.designPreview, true);
  assert.equal(body.environment.name, 'preview');
  assert.equal(body.environment.productionUrl, 'https://lowf-library.vercel.app');
  response = await bootstrap(); body = await response.json();
  assert.equal(body.settings.fixtureDesign, 'published'); assert.equal(body.designPreview, false);
  assert.equal(state.membershipCalls, 0);
});
