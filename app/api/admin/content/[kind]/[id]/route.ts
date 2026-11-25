import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route,json,assertSameOrigin,parseBody,HttpError } from '@/lib/api';
import { contentKindSchema,idSchema } from '@/lib/validation';
import { normalizeItem,validateAssets,adminItem } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';
type Context={params:Promise<{kind:string;id:string}>};
export const PATCH=route(async(request,ctx:Context)=>{
 assertSameOrigin(request);const user=await requireAdmin();await rateLimit(`admin:${user.id}`,90,60);
 const p=await ctx.params,kind=contentKindSchema.parse(p.kind),id=idSchema.parse(p.id),sql=getSQL();
 const rows=await sql`SELECT data,status FROM lowf_content WHERE kind=${kind} AND id=${id}`;
 if(!rows.length)throw new HttpError(404,'Không tìm thấy nội dung.');
 const body=await parseBody(request,z.record(z.string(),z.unknown()));
 if(body.id&&body.id!==id)throw new HttpError(400,'Không thể đổi mã nội dung.');
 const item=normalizeItem(kind,{...rows[0].data,status:rows[0].status,...body,id});
 await validateAssets(kind,item,user.id);
 await sql`UPDATE lowf_content SET data=${JSON.stringify(item)}::jsonb,status=${String(item.status)},updated_at=now() WHERE kind=${kind} AND id=${id}`;
 return json({item:adminItem(item)});
});
export const DELETE=route(async(request,ctx:Context)=>{
 assertSameOrigin(request);const user=await requireAdmin();await rateLimit(`admin:${user.id}`,90,60);
 const p=await ctx.params,kind=contentKindSchema.parse(p.kind),id=idSchema.parse(p.id),sql=getSQL();
 const rows=await sql`UPDATE lowf_content SET status='archived',data=jsonb_set(data,'{status}','"archived"') || CASE WHEN kind='plans' THEN '{"enabled":false}'::jsonb ELSE '{}'::jsonb END,updated_at=now() WHERE kind=${kind} AND id=${id} RETURNING id,data,status`;
 if(!rows.length)throw new HttpError(404,'Không tìm thấy nội dung.');
 return json({item:adminItem({...rows[0].data,id,status:'archived'})});
});
