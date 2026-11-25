// Opt-in checks of the deployed Neon OTP contract. Never sends email or uses a
// real reader's account/code. All well-formed attempts target a unique address
// in the reserved example.com domain that this test does not register.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';

const base = process.env.BASE_URL;
if (!base) throw new Error('BASE_URL is required for the opt-in OTP HTTP checks.');
const origin = new URL(base).origin;
const email = `lowf-otp-contract-${randomUUID()}@example.com`;
let checks = 0;
async function post(path, body, foreign = false) {
  const response = await fetch(new URL(`/api/auth/${path}`, base), {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/json', Origin: foreign ? 'https://foreign.invalid' : origin },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data };
}
async function check(label, action) {
  await action(); checks++; console.log('PASS', label);
}
for (const path of ['email-otp/verify-email', 'email-otp/reset-password', 'email-otp/send-verification-otp', 'email-otp/request-password-reset']) {
  await check(`deployed ${path} validates missing fields before any email or mutation`, async () => {
    const { response, data } = await post(path, {});
    assert.equal(response.status, 400);
    assert.equal(data.code, 'VALIDATION_ERROR');
  });
}
for (let attempt = 1; attempt <= 2; attempt++) {
  await check(`unknown verification code attempt ${attempt} cannot create a verified session`, async () => {
    const { response, data } = await post('email-otp/verify-email', { email, otp: '000000' });
    assert.equal(response.status, 400);
    assert.equal(data.code, 'INVALID_OTP');
    assert.equal(data.user, undefined);
    assert.equal(data.token, undefined);
    const cookies = response.headers.getSetCookie();
    assert.ok(!cookies.some(value => /^__Secure-neon-auth\.session_token=/.test(value)));
  });
}
await check('unknown password-reset code cannot reset credentials', async () => {
  const { response, data } = await post('email-otp/reset-password', {
    email, otp: '000000', password: randomBytes(24).toString('base64url'),
  });
  assert.equal(response.status, 400);
  assert.equal(data.code, 'INVALID_OTP');
});
await check('cross-origin OTP verification is rejected by the app boundary', async () => {
  const { response } = await post('email-otp/verify-email', { email, otp: '000000' }, true);
  assert.equal(response.status, 403);
});
console.log(`OTP HTTP QA completed: ${checks} checks. No accounts registered, emails sent, or real codes used.`);
