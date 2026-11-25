import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

/**
 * VNPAY PAY 2.1.0 (not token/instalment APIs).
 * Protocol: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * Encoding follows VNPAY's Node.js example: sorted keys, encodeURIComponent,
 * spaces as '+', then HMAC-SHA512 over exactly the encoded query string.
 */
export const VNPAY_ENDPOINTS = Object.freeze({
  sandbox: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  production: 'https://pay.vnpay.vn/vpcpay.html',
});
export const VNPAY_MIN_AMOUNT_VND = 5_000;
export const VNPAY_MAX_AMOUNT_VND = 9_999_999_999;
const keyPattern = /^vnp_[A-Za-z0-9_]{1,64}$/;
const signatureKeys = new Set(['vnp_SecureHash', 'vnp_SecureHashType']);
const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');

export function canonicalize(params: Record<string, string>): string {
  const keys = Object.keys(params).filter(key => !signatureKeys.has(key)).sort();
  if (keys.length > 64) throw new Error('Too many VNPAY parameters');
  return keys.map(key => {
    const value = params[key];
    if (!keyPattern.test(key) || typeof value !== 'string' || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new Error('Invalid VNPAY parameter');
    }
    return `${encode(key)}=${encode(value)}`;
  }).join('&');
}

export function signParams(params: Record<string, string>, secret: string): string {
  if (typeof secret !== 'string' || !secret || secret.length > 512) throw new Error('VNPAY signing key is not configured');
  return createHmac('sha512', secret).update(canonicalize(params), 'utf8').digest('hex');
}

export type VnpayVerification =
  | { valid: true; params: Record<string, string> }
  | { valid: false; reason: 'duplicate' | 'malformed' | 'signature' };

/** Verifies transport authenticity only. The caller must check the stored order,
 * merchant, exact amount and payment status before granting any entitlement. */
export function verifyVnpayQuery(search: URLSearchParams, secret: string): VnpayVerification {
  const values: Record<string, string> = {};
  const seen = new Set<string>();
  let bytes = 0;
  for (const [key, value] of search) {
    if (seen.has(key)) return { valid: false, reason: 'duplicate' };
    seen.add(key);
    bytes += key.length + value.length;
    if (!keyPattern.test(key) || seen.size > 66 || bytes > 16_384 || value.length > 2048 || /[\u0000-\u001f\u007f\ufffd]/.test(value)) {
      return { valid: false, reason: 'malformed' };
    }
    values[key] = value;
  }
  const signature = values.vnp_SecureHash;
  if (!signature || !/^[a-fA-F0-9]{128}$/.test(signature)) return { valid: false, reason: 'malformed' };
  if (values.vnp_SecureHashType && !/^hmacsha512$/i.test(values.vnp_SecureHashType)) return { valid: false, reason: 'malformed' };
  delete values.vnp_SecureHash;
  delete values.vnp_SecureHashType;
  if (!Object.keys(values).length) return { valid: false, reason: 'malformed' };
  try {
    const expected = Buffer.from(signParams(values, secret), 'hex');
    const received = Buffer.from(signature, 'hex');
    if (!timingSafeEqual(expected, received)) return { valid: false, reason: 'signature' };
    return { valid: true, params: values };
  } catch {
    return { valid: false, reason: 'malformed' };
  }
}

/** Vietnam has no daylight saving time; serialize the supplied instant at UTC+7. */
export function formatVnpayDate(date: Date): string {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('Invalid VNPAY date');
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  if (year < 0 || year > 9999) throw new Error('Invalid VNPAY date');
  return String(year).padStart(4, '0') + [local.getUTCMonth() + 1, local.getUTCDate(), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()].map(value => String(value).padStart(2, '0')).join('');
}

export type VnpayPaymentInput = {
  tmnCode: string;
  secret: string;
  mode: keyof typeof VNPAY_ENDPOINTS;
  txnRef: string;
  amountVnd: number;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  returnUrl: string;
};

export function buildPaymentUrl(input: VnpayPaymentInput): string {
  if (input.mode !== 'sandbox' && input.mode !== 'production') throw new Error('Invalid VNPAY environment');
  if (!/^[A-Za-z0-9]{8}$/.test(input.tmnCode)) throw new Error('Invalid VNPAY merchant code');
  if (!/^[A-Za-z0-9]{1,100}$/.test(input.txnRef)) throw new Error('Invalid VNPAY order reference');
  if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd < VNPAY_MIN_AMOUNT_VND || input.amountVnd > VNPAY_MAX_AMOUNT_VND) throw new Error('Invalid VNPAY amount');
  if (typeof input.secret !== 'string' || input.secret.length < 16 || input.secret.length > 512) throw new Error('VNPAY signing key is not configured');
  if (!isIP(input.ipAddress) || input.ipAddress.length > 45) throw new Error('Invalid VNPAY client address');
  const created = formatVnpayDate(input.createdAt), expires = formatVnpayDate(input.expiresAt);
  if (input.expiresAt.getTime() - input.createdAt.getTime() < 1000) throw new Error('Invalid VNPAY expiry');
  let returnUrl: URL;
  try { returnUrl = new URL(input.returnUrl); } catch { throw new Error('Invalid VNPAY return URL'); }
  if (returnUrl.protocol !== 'https:' || returnUrl.username || returnUrl.password || returnUrl.hash || input.returnUrl.length > 255) throw new Error('Invalid VNPAY return URL');
  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: input.tmnCode,
    vnp_Amount: String(input.amountVnd * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: `Thanh toan don hang Lowf ${input.txnRef}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: input.returnUrl,
    vnp_IpAddr: input.ipAddress,
    vnp_CreateDate: created,
    vnp_ExpireDate: expires,
  };
  return `${VNPAY_ENDPOINTS[input.mode]}?${canonicalize(params)}&vnp_SecureHash=${signParams(params, input.secret)}`;
}
