import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { isIsolatedPreviewEnv } from './env';
let client: NeonQueryFunction<false, false> | undefined;
export function getSQL() {
  if (!client) {
    const isolated = isIsolatedPreviewEnv();
    const url = isolated ? (process.env.LOWF_STAGING_DATABASE_URL || process.env.LOWF_PREVIEW_DATABASE_URL) : process.env.DATABASE_URL;
    if (!url) throw new Error(isolated ? 'Isolated staging/preview database is not configured' : 'Database is not configured');
    client = neon(url);
  }
  return client;
}
