import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
let client: NeonQueryFunction<false, false> | undefined;
export function getSQL() {
  if (!client) {
    const url = process.env.VERCEL_ENV==='preview' ? process.env.LOWF_PREVIEW_DATABASE_URL : process.env.DATABASE_URL;
    if (!url) throw new Error(process.env.VERCEL_ENV==='preview'?'Isolated preview database is not configured':'Database is not configured');
    client = neon(url);
  }
  return client;
}
