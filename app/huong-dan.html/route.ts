import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getUser } from '@/lib/auth/server';
export const dynamic='force-dynamic';

const EDGE_FALLBACK_GUIDE = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hướng dẫn quản trị Lowf Library</title><style>body{margin:0;background:#f6f7f3;color:#26382e;font:16px/1.75 system-ui,sans-serif}main{max-width:860px;margin:auto;padding:36px 22px 72px}a{color:#2c6546}h1{font:clamp(30px,5vw,46px)/1.15 Georgia,serif;margin:20px 0 12px}.btn{display:inline-block;background:#2c6546;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;margin:8px 8px 0 0}</style></head><body><main><a href="/admin">← Trở về Lowf Studio</a><h1>Hướng dẫn quản trị Lowf Library</h1><p>Quản lý toàn bộ sách, ảnh bìa (tải lên hoặc tìm kiếm Open Library/Google Books), lưu trữ Cloudflare R2, giao diện 12 mùa, thanh toán VNPAY và đơn hàng trực tiếp trong Lowf Studio.</p><p>Tài liệu kỹ thuật chi tiết được lưu trong thư mục <code>docs/</code> của repository <code>Huuluat-gif/Huuluat-gif</code> (<code>DEPLOYMENT_GUIDE.md</code>, <code>DNS_PLAN.md</code>, <code>ROLLBACK_GUIDE.md</code>).</p><a class="btn" href="/admin?tab=books">Quản lý Sách &amp; Bìa</a><a class="btn" href="/admin?tab=design">Giao diện &amp; 12 Mùa</a></main></body></html>`;

export async function GET(request:Request){
 const user=await getUser();
 if(!user)return Response.redirect(new URL('/?auth=login&next=%2Fadmin',request.url),303);
 if(!user.isAdmin)return new Response('Không tìm thấy trang.',{status:404});
 let html=EDGE_FALLBACK_GUIDE;
 try{
  html=await readFile(path.join(process.cwd(),'lib/admin/owner-guide.html'),'utf8');
 }catch{
  // Cloudflare Workers runtime has no local filesystem; serve embedded guide cleanly.
 }
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
