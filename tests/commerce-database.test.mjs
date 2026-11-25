import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';

// Actual PostgreSQL statements and callback handlers run against an isolated,
// in-memory PGlite database. No application credentials or external DB are used.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(root, 'tests/.commerce-database-'));
const database = new PGlite();
const previousSecret = process.env.NEON_AUTH_COOKIE_SECRET;
process.env.NEON_AUTH_COOKIE_SECRET = 'local-test-encryption-key-with-at-least-thirty-two-characters';
const statements = [];
globalThis.__lowfCommerceTestSQL = async (strings, ...values) => {
  const text = strings.reduce((query, part, index) => query + (index ? `$${index}` : '') + part, '');
  statements.push(text);
  return (await database.query(text, values)).rows;
};
await build({
  stdin: {
    contents: `export * from './lib/commerce/ipn';
      export {encryptPaymentSecret} from './lib/commerce/config';
      export {signParams} from './lib/commerce/vnpay';
      export {GET as handleIpn} from './app/api/payments/vnpay/ipn/route';
      export {GET as handleReturn} from './app/api/payments/vnpay/return/route';`,
    resolveDir: root, sourcefile: 'commerce-database-entry.ts', loader: 'ts',
  },
  outfile: path.join(temporary, 'callbacks.cjs'), bundle: true, packages: 'external',
  platform: 'node', format: 'cjs', logLevel: 'silent',
  plugins: [{ name: 'isolated-database', setup(plugin) {
    plugin.onResolve({ filter: /^@\/lib\/db$/ }, () => ({ path: 'test-database', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export function getSQL(){return globalThis.__lowfCommerceTestSQL}', loader: 'js',
    }));
  } }],
});
const { authenticateCallback, applyAuthenticatedNotification, encryptPaymentSecret, signParams, handleIpn, handleReturn } = createRequire(import.meta.url)(path.join(temporary, 'callbacks.cjs'));

// Load the exact DDL from the production migration without executing that script
// (which reads .env.local). Refuse interpolated templates rather than evaluating JS.
function literalStatements(source) {
  const block = source.match(/const statements\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, 'migration SQL array exists');
  const values = [...block[1].matchAll(/`([^`]*)`/g)].map(match => match[1]);
  assert.ok(values.length > 0);
  assert.ok(values.every(value => !value.includes('${')), 'migration contains only literal SQL');
  return values;
}
const commerceDdl = literalStatements(await readFile(path.join(root, 'scripts/commerce-init.ts'), 'utf8'));
const baseDdl = literalStatements(await readFile(path.join(root, 'scripts/db-init.ts'), 'utf8'));
const membershipDdl = baseDdl.find(sql => sql.startsWith('CREATE TABLE IF NOT EXISTS lowf_memberships('));
assert.ok(membershipDdl);
for (const sql of [membershipDdl, ...commerceDdl]) await database.exec(sql);
after(async () => {
  if (previousSecret === undefined) delete process.env.NEON_AUTH_COOKIE_SECRET;
  else process.env.NEON_AUTH_COOKIE_SECRET = previousSecret;
  delete globalThis.__lowfCommerceTestSQL;
  await database.close();
  await rm(temporary, { recursive: true, force: true });
});

const merchantSecret = 'local-fixture-only-vnpay-signing-key';
let transactionNumber = 10_000;
const bookItems = [
  { kind: 'book', id: 'ebook-fixture', format: 'Ebook', quantity: 1 },
  { kind: 'book', id: 'combo-fixture', format: 'Combo', quantity: 1 },
  { kind: 'book', id: 'paper-fixture', format: 'Sách giấy', quantity: 1 },
];
async function fixture(options = {}) {
  const configVersion = randomUUID(), orderId = randomUUID();
  const userId = options.userId || `test-user-${randomUUID()}`;
  const reference = `LF${randomUUID().replaceAll('-', '')}`;
  const mode = options.mode || 'production';
  const items = options.items || [...bookItems, { kind: 'plan', id: 'plus', interval: 'month', quantity: 1 }];
  await database.query('INSERT INTO lowf_payment_config(version,mode,tmn_code,secret_cipher,created_by) VALUES($1,$2,$3,$4,$5)',
    [configVersion, mode, 'LOWFTEST', encryptPaymentSecret(merchantSecret), 'local-test-owner']);
  await database.query(`INSERT INTO lowf_orders(id,user_id,reference,mode,config_version,status,items,customer,subtotal_vnd,total_vnd,idempotency_key,request_fingerprint,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'{}'::jsonb,49000,49000,$8,'fixture',now()+interval '15 minutes')`,
    [orderId, userId, reference, mode, configVersion, options.status || 'pending', JSON.stringify(items), randomUUID()]);
  const params = { vnp_TmnCode: 'LOWFTEST', vnp_TxnRef: reference, vnp_Amount: '4900000', vnp_CurrCode: 'VND',
    vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: String(++transactionNumber) };
  return { orderId, userId, reference, mode, configVersion, params };
}
function signed(params, secret = merchantSecret) {
  return new URLSearchParams({ ...params, vnp_SecureHash: signParams(params, secret) });
}
function request(kind, query) { return new Request(`https://lowf-library.vercel.app/api/payments/vnpay/${kind}?${query}`); }
async function authenticate(f, overrides = {}) {
  const result = await authenticateCallback(signed({ ...f.params, ...overrides }));
  assert.equal('failure' in result, false);
  return result;
}
async function deliver(f, overrides = {}) {
  const response = await handleIpn(request('ipn', signed({ ...f.params, ...overrides })));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}
async function state(f) {
  const order = (await database.query('SELECT * FROM lowf_orders WHERE id=$1', [f.orderId])).rows[0];
  const grants = (await database.query('SELECT * FROM lowf_order_grants WHERE order_id=$1', [f.orderId])).rows;
  const books = (await database.query('SELECT * FROM lowf_book_entitlements WHERE order_id=$1 ORDER BY book_id', [f.orderId])).rows;
  const membership = (await database.query('SELECT * FROM lowf_memberships WHERE user_id=$1', [f.userId])).rows[0];
  return { order, grants, books, membership };
}
function assertNoGrants(result) {
  assert.equal(result.grants.length, 0);
  assert.equal(result.books.length, 0);
  assert.equal(result.membership, undefined);
}

test('callback uses the immutable order merchant/config version after active credentials rotate', async () => {
  const f = await fixture();
  await database.query('UPDATE lowf_payment_config SET is_active=false WHERE is_active=true');
  await database.query(`INSERT INTO lowf_payment_config(version,is_active,mode,tmn_code,secret_cipher,created_by)
    VALUES($1,true,'production','NEWMERCH',$2,'local-test-owner')`, [randomUUID(), encryptPaymentSecret('rotated-local-fixture-signing-key')]);
  const authenticated = await authenticate(f);
  assert.equal(authenticated.order.config_version, f.configVersion);
  const wrongKey = await authenticateCallback(signed(f.params, 'rotated-local-fixture-signing-key'));
  assert.equal(wrongKey.failure.RspCode, '97');
  assert.equal((await state(f)).order.status, 'pending');
});

test('valid signatures still require the stored merchant, exact amount and well-formed payment fields', async () => {
  const f = await fixture();
  for (const [override, expected] of [
    [{ vnp_TmnCode: 'BADMERCH' }, '97'], [{ vnp_Amount: '4900001' }, '04'],
    [{ vnp_Amount: '04900000' }, '04'], [{ vnp_Amount: '4900000.0' }, '04'],
    [{ vnp_CurrCode: 'USD' }, '97'], [{ vnp_ResponseCode: '0' }, '97'],
    [{ vnp_TransactionStatus: '' }, '97'], [{ vnp_TransactionNo: '' }, '97'],
    [{ vnp_TransactionNo: '0000' }, '97'], [{ vnp_TransactionNo: 'tx123' }, '97'],
  ]) {
    assert.equal((await deliver(f, override)).RspCode, expected);
  }
  const final = await state(f);
  assert.equal(final.order.status, 'pending');
  assertNoGrants(final);
});

test('tampered, duplicate and nonexistent-order IPNs cannot write an order or entitlement', async () => {
  const f = await fixture();
  const tampered = signed(f.params); tampered.set('vnp_Amount', '9900000');
  const duplicate = signed(f.params); duplicate.append('vnp_TxnRef', f.reference);
  const missing = signed({ ...f.params, vnp_TxnRef: 'UNKNOWNORDER123' });
  for (const [query, expected] of [[tampered, '97'], [duplicate, '97'], [missing, '01']]) {
    const result = await handleIpn(request('ipn', query));
    assert.equal((await result.json()).RspCode, expected);
  }
  const final = await state(f);
  assert.equal(final.order.status, 'pending');
  assertNoGrants(final);
});

test('production success atomically grants purchased Ebook/Combo and one membership to the order owner', async () => {
  const f = await fixture();
  assert.equal((await deliver(f)).RspCode, '00');
  const final = await state(f);
  assert.equal(final.order.status, 'paid');
  assert.equal(final.order.gateway_transaction_no, f.params.vnp_TransactionNo);
  assert.ok(final.order.paid_at);
  assert.equal(final.grants.length, 1);
  assert.deepEqual(final.books.map(book => book.book_id), ['combo-fixture', 'ebook-fixture']);
  assert.ok(final.books.every(book => book.user_id === f.userId));
  assert.equal(final.membership.user_id, f.userId);
  assert.equal(final.membership.access, 'member');
  assert.equal(final.membership.status, 'active');
  assert.equal(final.membership.plan_id, 'plus');
  const days = (new Date(final.membership.expires_at) - new Date(final.order.paid_at)) / 86_400_000;
  assert.ok(days >= 28 && days <= 31);
});

test('overlapping stale notifications transition and grant once; every replay preserves expiry', async () => {
  const f = await fixture();
  const callbacks = await Promise.all(Array.from({ length: 8 }, () => authenticate(f)));
  assert.ok(callbacks.every(callback => callback.order.status === 'pending'));
  // PGlite has one connection. This exercises overlapping async calls with stale
  // authenticated order snapshots; PostgreSQL executes the real guarded CTE.
  const results = await Promise.all(callbacks.map(callback => applyAuthenticatedNotification(callback.order, callback.params)));
  assert.equal(results.filter(result => result.RspCode === '00').length, 1);
  assert.equal(results.filter(result => result.RspCode === '02').length, 7);
  const initial = await state(f);
  assert.equal(initial.grants.length, 1);
  assert.equal(initial.books.length, 2);
  for (let index = 0; index < 3; index++) assert.equal((await deliver(f)).RspCode, '02');
  assert.equal((await deliver(f, { vnp_TransactionNo: String(++transactionNumber) })).RspCode, '02');
  const replayed = await state(f);
  assert.equal(new Date(replayed.membership.expires_at).toISOString(), new Date(initial.membership.expires_at).toISOString());
  assert.equal(replayed.order.gateway_transaction_no, f.params.vnp_TransactionNo);
  assert.equal(replayed.grants.length, 1);
  assert.equal(replayed.books.length, 2);
});

test('sandbox successes and replays never grant books or create or extend real membership', async () => {
  const f = await fixture({ mode: 'sandbox' });
  assert.equal((await deliver(f)).RspCode, '00');
  let final = await state(f);
  assert.equal(final.order.status, 'sandbox_paid');
  assertNoGrants(final);
  assert.equal((await deliver(f)).RspCode, '02');
  assert.equal((await deliver(f, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02', vnp_TransactionNo: '0' })).RspCode, '02');
  assert.equal((await state(f)).order.status, 'sandbox_paid');
  const existing = await fixture({ mode: 'sandbox' });
  await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at) VALUES($1,'existing','active','member',now()+interval '45 days')`, [existing.userId]);
  const before = (await state(existing)).membership;
  assert.equal((await deliver(existing)).RspCode, '00');
  final = await state(existing);
  assert.equal(final.grants.length, 0);
  assert.equal(final.books.length, 0);
  assert.deepEqual(final.membership, before);
});

test('an authenticated browser return only redirects and never marks paid or grants access', async () => {
  for (const override of [{}, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02', vnp_TransactionNo: '0' }]) {
    const f = await fixture();
    const start = statements.length;
    const response = await handleReturn(request('return', signed({ ...f.params, ...override })));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.origin, 'https://lowf-library.vercel.app');
    assert.equal(destination.searchParams.get('payment'), 'returned');
    assert.equal(destination.searchParams.get('order'), f.orderId);
    assert.ok(statements.slice(start).every(sql => /^\s*SELECT\b/i.test(sql)));
    const final = await state(f);
    assert.equal(final.order.status, 'pending');
    assert.equal(final.order.paid_at, null);
    assertNoGrants(final);
  }
  const f = await fixture();
  const invalid = signed(f.params); invalid.set('vnp_SecureHash', '0'.repeat(128));
  const destination = new URL((await handleReturn(request('return', invalid))).headers.get('location'));
  assert.equal(destination.searchParams.get('payment'), 'invalid');
  assert.equal(destination.searchParams.has('order'), false);
});

test('a signed failed payment can later succeed, while a stale failure cannot downgrade a paid order', async () => {
  const f = await fixture();
  const failure = { vnp_ResponseCode: '24', vnp_TransactionStatus: '02', vnp_TransactionNo: '0' };
  assert.equal((await deliver(f, failure)).RspCode, '00');
  assert.equal((await state(f)).order.status, 'failed');
  assertNoGrants(await state(f));
  assert.equal((await deliver(f, failure)).RspCode, '02');
  assert.equal((await deliver(f)).RspCode, '00');
  const paid = await state(f);
  assert.equal(paid.order.status, 'paid');
  assert.equal(paid.grants.length, 1);
  assert.equal((await deliver(f, failure)).RspCode, '02');
  assert.deepEqual(await state(f), paid);
});

test('gateway success requires both success codes and an expired order can still accept a valid delayed IPN', async () => {
  const inconsistent = await fixture();
  assert.equal((await deliver(inconsistent, { vnp_TransactionStatus: '02' })).RspCode, '00');
  const unsuccessful = await state(inconsistent);
  assert.equal(unsuccessful.order.status, 'failed');
  assertNoGrants(unsuccessful);
  const expired = await fixture({ status: 'expired' });
  assert.equal((await deliver(expired)).RspCode, '00');
  const final = await state(expired);
  assert.equal(final.order.status, 'paid');
  assert.equal(final.grants.length, 1);
});

test('membership renewal extends existing access once and never shortens lifetime access', async () => {
  const f = await fixture();
  await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
    VALUES($1,'existing','active','member',now()+interval '45 days')`, [f.userId]);
  const before = (await state(f)).membership;
  assert.equal((await deliver(f)).RspCode, '00');
  const afterPayment = (await state(f)).membership;
  const addedDays = (new Date(afterPayment.expires_at) - new Date(before.expires_at)) / 86_400_000;
  assert.ok(addedDays >= 28 && addedDays <= 31);
  assert.equal((await deliver(f)).RspCode, '02');
  assert.deepEqual((await state(f)).membership, afterPayment);
  const lifetime = await fixture();
  await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
    VALUES($1,'lifetime','active','member',NULL)`, [lifetime.userId]);
  assert.equal((await deliver(lifetime)).RspCode, '00');
  assert.equal((await state(lifetime)).membership.expires_at, null);
  const lifetimePurchase = await fixture({ items: [{ kind: 'plan', id: 'lifetime', interval: 'once' }] });
  assert.equal((await deliver(lifetimePurchase)).RspCode, '00');
  assert.equal((await state(lifetimePurchase)).membership.expires_at, null);
});

test('monthly renewal adds a calendar month to future membership expiry, not the payment-date duration', async () => {
  const f = await fixture();
  // Select a future month whose length differs from the month at payment time,
  // so this expectation remains meaningful whenever this test suite is run.
  const dates = (await database.query(`WITH candidates AS (
    SELECT date_trunc('month',now()) + n * interval '1 month' + interval '15 days' AS expires
    FROM generate_series(1,24) n
  ) SELECT expires,expires + interval '1 month' AS expected FROM candidates
    WHERE (expires + interval '1 month' - expires) <> (now() + interval '1 month' - now())
    ORDER BY expires LIMIT 1`)).rows[0];
  assert.ok(dates);
  await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
    VALUES($1,'existing','active','member',$2)`, [f.userId, dates.expires]);
  assert.equal((await deliver(f)).RspCode, '00');
  const membership = (await state(f)).membership;
  assert.equal(new Date(membership.expires_at).toISOString(), new Date(dates.expected).toISOString());
});

test('end-of-January renewal lands on the final valid February day', async () => {
  const f = await fixture();
  const dates = (await database.query(`WITH future AS (
    SELECT date_trunc('year',now()) + interval '1 year 1 month' - interval '1 day' AS expires
  ) SELECT expires, expires + interval '1 month' AS expected FROM future`)).rows[0];
  await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
    VALUES($1,'existing','active','member',$2)`, [f.userId, dates.expires]);
  assert.equal((await deliver(f)).RspCode, '00');
  assert.equal(new Date((await state(f)).membership.expires_at).toISOString(), new Date(dates.expected).toISOString());
});

test('annual renewal preserves the calendar date across leap-year differences', async () => {
  const f = await fixture({ items: [{ kind: 'plan', id: 'annual', interval: 'year' }] });
  const dates = (await database.query(`WITH candidates AS (
    SELECT date_trunc('year',now()) + n * interval '1 year' + interval '1 month 15 days' AS expires
    FROM generate_series(1,8) n
  ) SELECT expires,expires + interval '1 year' AS expected FROM candidates
    WHERE (expires + interval '1 year' - expires) <> (now() + interval '1 year' - now())
    ORDER BY expires LIMIT 1`)).rows[0];
  assert.ok(dates);
  await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
    VALUES($1,'existing','active','member',$2)`, [f.userId, dates.expires]);
  assert.equal((await deliver(f)).RspCode, '00');
  assert.equal(new Date((await state(f)).membership.expires_at).toISOString(), new Date(dates.expected).toISOString());
});

test('expired, canceled and free memberships start paid access from payment time', async () => {
  for (const previous of [
    { status: 'active', access: 'member', days: -20 },
    { status: 'canceled', access: 'member', days: 45 },
    { status: 'active', access: 'free', days: 45 },
  ]) {
    const f = await fixture();
    await database.query(`INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
      VALUES($1,'existing',$2,$3,now()+$4*interval '1 day')`, [f.userId, previous.status, previous.access, previous.days]);
    assert.equal((await deliver(f)).RspCode, '00');
    const result = (await database.query(`SELECT m.access,m.status,
      m.expires_at = o.paid_at + interval '1 month' AS correct_expiry
      FROM lowf_memberships m JOIN lowf_orders o ON o.user_id=m.user_id WHERE o.id=$1`, [f.orderId])).rows[0];
    assert.equal(result.access, 'member');
    assert.equal(result.status, 'active');
    assert.equal(result.correct_expiry, true);
  }
});

test('sandbox gateway transaction numbers are isolated from production transactions', async () => {
  const production = await fixture();
  assert.equal((await deliver(production)).RspCode, '00');
  const sandbox = await fixture({ mode: 'sandbox' });
  assert.equal((await deliver(sandbox, { vnp_TransactionNo: production.params.vnp_TransactionNo })).RspCode, '00');
  const final = await state(sandbox);
  assert.equal(final.order.status, 'sandbox_paid');
  assertNoGrants(final);
});

test('a gateway transaction reused for another order rolls back status and every entitlement', async () => {
  const original = await fixture();
  assert.equal((await deliver(original)).RspCode, '00');
  const other = await fixture();
  const callback = await authenticate(other, { vnp_TransactionNo: original.params.vnp_TransactionNo });
  await assert.rejects(applyAuthenticatedNotification(callback.order, callback.params), error => error.code === '23505');
  let final = await state(other);
  assert.equal(final.order.status, 'pending');
  assert.equal(final.order.paid_at, null);
  assertNoGrants(final);
  const previousError = console.error;
  console.error = () => {};
  try { assert.equal((await deliver(other, { vnp_TransactionNo: original.params.vnp_TransactionNo })).RspCode, '99'); }
  finally { console.error = previousError; }
  final = await state(other);
  assert.equal(final.order.status, 'pending');
  assertNoGrants(final);
});

test('an entitlement insert failure rolls back the confirmed order and permits a clean retry', async () => {
  const f = await fixture();
  await database.exec(`ALTER TABLE lowf_book_entitlements ADD CONSTRAINT local_fixture_reject_book CHECK (book_id <> 'combo-fixture') NOT VALID`);
  const callback = await authenticate(f);
  try {
    await assert.rejects(applyAuthenticatedNotification(callback.order, callback.params), error => error.code === '23514');
    const rolledBack = await state(f);
    assert.equal(rolledBack.order.status, 'pending');
    assert.equal(rolledBack.order.paid_at, null);
    assert.equal(rolledBack.order.gateway_transaction_no, null);
    assertNoGrants(rolledBack);
  } finally { await database.exec('ALTER TABLE lowf_book_entitlements DROP CONSTRAINT local_fixture_reject_book'); }
  assert.equal((await deliver(f)).RspCode, '00');
  const retry = await state(f);
  assert.equal(retry.order.status, 'paid');
  assert.equal(retry.grants.length, 1);
  assert.equal(retry.books.length, 2);
});

test('commerce migrations are idempotent and retain existing orders and paid entitlements', async () => {
  const f = await fixture();
  assert.equal((await deliver(f)).RspCode, '00');
  const before = await state(f);
  for (const sql of [membershipDdl, ...commerceDdl]) await database.exec(sql);
  assert.deepEqual(await state(f), before);
});
