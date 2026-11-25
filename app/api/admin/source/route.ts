import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth/server';
import { route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
export const dynamic='force-dynamic';
export const GET=route(async()=>{
 const user=await requireAdmin();await rateLimit(`source:${user.id}`,10,60);
 const archive=await readFile(path.join(process.cwd(),'private-generated/lowf-source.zip'));
 return new Response(new Uint8Array(archive),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="lowf-source.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
});
