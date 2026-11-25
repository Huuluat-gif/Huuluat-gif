import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getUser } from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const user=await getUser();
 if(!user)return Response.redirect(new URL('/?auth=login&next=%2Fadmin',request.url),303);
 if(!user.isAdmin)return new Response('Không tìm thấy trang.',{status:404});
 const html=await readFile(path.join(process.cwd(),'lib/admin/owner-guide.html'),'utf8');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
