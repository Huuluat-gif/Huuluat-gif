import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route,json,assertSameOrigin,parseBody,HttpError } from '@/lib/api';
import { contentKindSchema } from '@/lib/validation';
import { normalizeItem,validateAssets,adminItem } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';
type Context={params:Promise<{kind:string}>};
export const dynamic='force-dynamic';
export const GET=route(async(_request,ctx:Context)=>{
 await requireAdmin();const kind=contentKindSchema.parse((await ctx.params).kind),sql=getSQL();
 const rows=await sql`SELECT id,data-'chapters' AS data,status,created_at,updated_at,CASE WHEN kind='books' THEN jsonb_array_length(COALESCE(data->'chapters','[]'::jsonb)) ELSE 0 END AS chapter_count FROM lowf_content WHERE kind=${kind} ORDER BY updated_at DESC LIMIT 500`;
 return json({items:rows.map(r=>({...r.data,id:r.id,status:r.status,chapterCount:Number(r.chapter_count||0),createdAt:r.created_at,updatedAt:r.updated_at}))});
});
export const POST=route(async(request,ctx:Context)=>{
 assertSameOrigin(request);const user=await requireAdmin();await rateLimit(`admin:${user.id}`,90,60);
 const kind=contentKindSchema.parse((await ctx.params).kind),body=await parseBody(request,z.record(z.string(),z.unknown()));
 if(!body.id)delete body.id;
 const item=normalizeItem(kind,body),id=String(item.id||randomUUID());item.id=id;
 await validateAssets(kind,item,user.id);const sql=getSQL();
 const rows=await sql`INSERT INTO lowf_content(kind,id,data,status) VALUES(${kind},${id},${JSON.stringify(item)}::jsonb,${String(item.status)}) ON CONFLICT(kind,id) DO NOTHING RETURNING id`;
 if(!rows.length)throw new HttpError(409,'Mã nội dung đã tồn tại.');
 return json({item:adminItem(item)},201);
});
