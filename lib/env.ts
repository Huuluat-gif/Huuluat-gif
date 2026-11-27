/**
 * Unified runtime & environment helper compatible with Cloudflare Workers,
 * Vercel Serverless, and local Node.js development.
 */
export type AppEnvironment = 'production' | 'staging' | 'preview' | 'development';

export function getAppEnv(): AppEnvironment {
  const explicit = (process.env.LOWF_ENV || process.env.CF_ENV || process.env.VERCEL_ENV || '').trim().toLowerCase();
  if (explicit === 'production') return 'production';
  if (explicit === 'staging') return 'staging';
  if (explicit === 'preview') return 'preview';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

export function isProductionEnv(): boolean {
  return getAppEnv() === 'production';
}

export function isIsolatedPreviewEnv(): boolean {
  const env = getAppEnv();
  return env === 'preview' || env === 'staging';
}

export function isHttpsIngress(): boolean {
  return (
    process.env.VERCEL === '1' ||
    process.env.CF_WORKERS === '1' ||
    process.env.LOWF_FORCE_HTTPS === '1' ||
    isProductionEnv() ||
    isIsolatedPreviewEnv()
  );
}

export function getCanonicalOrigin(): string {
  const configured = (process.env.LOWF_CANONICAL_ORIGIN || '').trim().replace(/\/+$/, '');
  if (configured && /^https:\/\/[a-z0-9.-]+$/i.test(configured)) return configured;
  return 'https://www.lowflibray.com';
}

export function getStagingOrigin(): string {
  const configured = (process.env.LOWF_STAGING_ORIGIN || '').trim().replace(/\/+$/, '');
  if (configured && /^https:\/\/[a-z0-9.-]+$/i.test(configured)) return configured;
  return 'https://lowf-library-staging.huuluat05.workers.dev';
}

/**
 * Extract the verified client IP from trusted platform ingress headers only
 * (Cloudflare CF-Connecting-IP or Vercel X-Vercel-Forwarded-For).
 */
export function getTrustedClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  if (process.env.VERCEL === '1') {
    const vercelIp = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || '')
      .split(',')[0]
      .trim();
    if (vercelIp) return vercelIp;
  }
  return '';
}
