import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, test } from 'node:test';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(root, 'tests/.commerce-vnpay-'));
await build({ entryPoints: [path.join(root, 'lib/commerce/vnpay.ts')], outfile: path.join(temporary, 'protocol.cjs'), bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
const { canonicalize, signParams, verifyVnpayQuery, formatVnpayDate, buildPaymentUrl, VNPAY_ENDPOINTS } = createRequire(import.meta.url)(path.join(temporary, 'protocol.cjs'));
after(() => rm(temporary, { recursive: true, force: true }));
const secret = 'fixture-only-not-a-merchant-secret';
const params = { vnp_TxnRef: 'LF20261117A1', vnp_TmnCode: 'LOWFTEST', vnp_OrderInfo: 'Lowf & Books', vnp_Amount: '4900000' };

test('canonicalization follows VNPAY Node2.1 sorted fields and plus-encoded spaces', () => {
  assert.equal(canonicalize(params), 'vnp_Amount=4900000&vnp_OrderInfo=Lowf+%26+Books&vnp_TmnCode=LOWFTEST&vnp_TxnRef=LF20261117A1');
  assert.equal(canonicalize({ vnp_OrderInfo: 'Sách + sách / 100%', vnp_SecureHash: 'ignored', vnp_SecureHashType: 'HmacSHA512' }), 'vnp_OrderInfo=S%C3%A1ch+%2B+s%C3%A1ch+%2F+100%25');
});

test('HMAC agrees with an independent Python hashlib/hmac fixture', () => {
  // Generated independently with Python hmac.new(key, literal_query, hashlib.sha512).
  const expected = '41c8245e364d79d2dd9cc8debc53c012d0280c811b92bfb16e2676394d51e722ac938c9dd927b6e8b082ab4a950b53eba1347abc21b863995c385bbe340bc717';
  assert.equal(signParams(params, secret), expected);
  const query = new URLSearchParams(canonicalize(params) + '&vnp_SecureHash=' + expected);
  assert.deepEqual(verifyVnpayQuery(query, secret), { valid: true, params: { vnp_Amount: '4900000', vnp_OrderInfo: 'Lowf & Books', vnp_TmnCode: 'LOWFTEST', vnp_TxnRef: 'LF20261117A1' } });
  query.set('vnp_SecureHash', expected.toUpperCase());
  assert.equal(verifyVnpayQuery(query, secret).valid, true);
});

test('modifying an amount, merchant, order reference or signing key fails authenticity', () => {
  const signature = signParams(params, secret);
  for (const [field, value] of [['vnp_Amount', '4900001'], ['vnp_TmnCode', 'OTHERS01'], ['vnp_TxnRef', 'OTHERORDER']]) {
    const query = new URLSearchParams({ ...params, [field]: value, vnp_SecureHash: signature });
    assert.deepEqual(verifyVnpayQuery(query, secret), { valid: false, reason: 'signature' });
  }
  assert.deepEqual(verifyVnpayQuery(new URLSearchParams({ ...params, vnp_SecureHash: signature }), 'different-fixture-key'), { valid: false, reason: 'signature' });
});

test('duplicate parameters cannot create signature/application interpretation differences', () => {
  for (const field of ['vnp_Amount', 'vnp_TxnRef', 'vnp_SecureHash']) {
    const query = new URLSearchParams({ ...params, vnp_SecureHash: signParams(params, secret) });
    query.append(field, query.get(field));
    assert.deepEqual(verifyVnpayQuery(query, secret), { valid: false, reason: 'duplicate' });
  }
});

test('malformed hashes, algorithm confusion and unrelated query data fail closed', () => {
  for (const hash of ['', '0'.repeat(64), 'g'.repeat(128), '0'.repeat(129), 'ab']) {
    assert.deepEqual(verifyVnpayQuery(new URLSearchParams({ ...params, vnp_SecureHash: hash }), secret), { valid: false, reason: 'malformed' });
  }
  for (const extra of [{ utm_source: 'mail' }, { vnp_SecureHashType: 'SHA256' }, { vnp_BankCode: '\u0000' }, { vnp_BankCode: '\ufffd' }, { vnp_BankCode: 'x'.repeat(2049) }]) {
    assert.deepEqual(verifyVnpayQuery(new URLSearchParams({ ...params, ...extra, vnp_SecureHash: signParams(params, secret) }), secret), { valid: false, reason: 'malformed' });
  }
  assert.deepEqual(verifyVnpayQuery(new URLSearchParams({ vnp_SecureHash: signParams({}, secret) }), secret), { valid: false, reason: 'malformed' });
});

test('optional empty callback fields and supported explicit hash type remain authentic', () => {
  const callback = { ...params, vnp_BankTranNo: '' };
  const query = new URLSearchParams({ ...callback, vnp_SecureHashType: 'HmacSHA512', vnp_SecureHash: signParams(callback, secret) });
  const result = verifyVnpayQuery(query, secret);
  assert.equal(result.valid, true);
  assert.equal(result.params.vnp_BankTranNo, '');
  assert.equal(Object.hasOwn(result.params, 'vnp_SecureHashType'), false);
});

const paymentInput = {
  tmnCode: 'LOWFTEST', secret, mode: 'sandbox', txnRef: 'LF20261118A1', amountVnd: 49_000,
  ipAddress: '203.0.113.5', createdAt: new Date('2026-11-17T20:00:00.000Z'),
  expiresAt: new Date('2026-11-17T20:15:00.000Z'), returnUrl: 'https://lowf-library.vercel.app/api/payments/vnpay/return',
};

test('checkout URL uses official endpoints, GMT+7 dates and exact integer minor units', () => {
  assert.equal(formatVnpayDate(new Date('2026-12-31T20:05:09Z')), '20270101030509');
  const sandbox = new URL(buildPaymentUrl(paymentInput));
  assert.equal(sandbox.origin + sandbox.pathname, VNPAY_ENDPOINTS.sandbox);
  assert.equal(sandbox.searchParams.get('vnp_Amount'), '4900000');
  assert.equal(sandbox.searchParams.get('vnp_CreateDate'), '20261118030000');
  assert.equal(sandbox.searchParams.get('vnp_ExpireDate'), '20261118031500');
  assert.equal(sandbox.searchParams.get('vnp_CurrCode'), 'VND');
  assert.equal(sandbox.searchParams.get('vnp_OrderInfo'), 'Thanh toan don hang Lowf LF20261118A1');
  assert.equal(sandbox.searchParams.get('vnp_ReturnUrl'), paymentInput.returnUrl);
  assert.equal(verifyVnpayQuery(sandbox.searchParams, secret).valid, true);
  const production = new URL(buildPaymentUrl({ ...paymentInput, mode: 'production' }));
  assert.equal(production.origin + production.pathname, 'https://pay.vnpay.vn/vpcpay.html');
});

test('checkout rejects amounts under gateway minimum, fractional VND and overflow', () => {
  for (const amountVnd of [0, 4999, 5000.5, -5000, Infinity, NaN, 10_000_000_000, Number.MAX_SAFE_INTEGER]) assert.throws(() => buildPaymentUrl({ ...paymentInput, amountVnd }), /amount/);
  assert.equal(new URL(buildPaymentUrl({ ...paymentInput, amountVnd: 5000 })).searchParams.get('vnp_Amount'), '500000');
  assert.equal(new URL(buildPaymentUrl({ ...paymentInput, amountVnd: 9_999_999_999 })).searchParams.get('vnp_Amount'), '999999999900');
});

test('checkout rejects invalid identities, injected addresses, unsupported endpoints and expiry', () => {
  for (const tmnCode of ['', 'SHORT', 'LOWF!', 'LOWFTESTMORE']) {
    assert.throws(() => buildPaymentUrl({ ...paymentInput, tmnCode }), /merchant/);
  }
  for (const txnRef of ['', 'bad&ref', 'bad-ref', 'x'.repeat(101)]) assert.throws(() => buildPaymentUrl({ ...paymentInput, txnRef }), /reference/);
  for (const ipAddress of ['', '203.0.113.5,1.2.3.4', '127.0.0.1\n']) assert.throws(() => buildPaymentUrl({ ...paymentInput, ipAddress }), /address/);
  for (const returnUrl of ['javascript:alert(1)', 'http://lowf.example/return', 'https://name:password@lowf.example/return', 'https://lowf.example/return#fragment']) assert.throws(() => buildPaymentUrl({ ...paymentInput, returnUrl }), /return URL/);
  assert.throws(() => buildPaymentUrl({ ...paymentInput, mode: 'constructor' }), /environment/);
  assert.throws(() => buildPaymentUrl({ ...paymentInput, expiresAt: paymentInput.createdAt }), /expiry/);
  assert.throws(() => buildPaymentUrl({ ...paymentInput, createdAt: new Date('invalid') }), /date/);
  assert.throws(() => buildPaymentUrl({ ...paymentInput, secret: '' }), /signing key/);
});
