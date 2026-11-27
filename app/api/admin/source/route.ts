import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth/server';
import { HttpError, route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { isR2Configured, r2GetObject } from '@/lib/r2';
export const dynamic='force-dynamic';
export const GET=route(async()=>{
 const user=await requireAdmin();await rateLimit(`source:${user.id}`,10,60);
 try {
  const archive=await readFile(path.join(process.cwd(),'private-generated/lowf-source.zip'));
  return new Response(new Uint8Array(archive),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="lowf-source.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 } catch {
  if (isR2Configured()) {
   const r2Res = await r2GetObject('assets/system/lowf-source.zip');
   if (r2Res?.body) {
    return new Response(r2Res.body,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="lowf-source.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
   }
  }
  throw new HttpError(404,'Bản đóng gói mã nguồn chưa sẵn sàng trên môi trường edge này. Hãy tải trực tiếp từ kho GitHub của dự án.');
 }
});
