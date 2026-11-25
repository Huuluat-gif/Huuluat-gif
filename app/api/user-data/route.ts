import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireUser } from '@/lib/auth/server';
import { json,route,assertSameOrigin,parseBody,dayKey,HttpError } from '@/lib/api';
import { getUserData } from '@/lib/user-data';
import { idSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({saved:z.array(idSchema).max(500).optional(),progress:z.record(idSchema,z.object({chapter:z.number().int().min(0).max(9999),finished:z.boolean().optional(),updated:z.string().max(40).optional()}).strict()).refine(p=>Object.keys(p).length<=500).optional()}).strict().refine(o=>o.saved!==undefined||o.progress!==undefined);
export const POST=route(async request=>{
 assertSameOrigin(request);const user=await requireUser();await rateLimit(`data:${user.id}`,120,60);const body=await parseBody(request,schema);const sql=getSQL();
 const ids=[...new Set([...(body.saved||[]),...Object.keys(body.progress||{})])];
 if(ids.length){const rows=await sql`SELECT id FROM lowf_content WHERE kind='books' AND status='published' AND id=ANY(${ids}::text[])`;const allowed=new Set(rows.map(r=>r.id));if(ids.some(id=>!allowed.has(id)))throw new HttpError(400,'Một cuốn sách không còn trong thư viện.');}
 const progress=Object.fromEntries(Object.entries(body.progress||{}).map(([id,p])=>[id,{chapter:p.chapter,finished:p.finished||false,updated:dayKey()}]));
 if(body.saved!==undefined){await sql`INSERT INTO lowf_user_data(user_id,saved,progress) VALUES(${user.id},${JSON.stringify([...new Set(body.saved)])}::jsonb,${JSON.stringify(progress)}::jsonb) ON CONFLICT(user_id) DO UPDATE SET saved=EXCLUDED.saved,progress=lowf_user_data.progress||EXCLUDED.progress,updated_at=now()`;}
 else await sql`INSERT INTO lowf_user_data(user_id,progress) VALUES(${user.id},${JSON.stringify(progress)}::jsonb) ON CONFLICT(user_id) DO UPDATE SET progress=lowf_user_data.progress||EXCLUDED.progress,updated_at=now()`;
 return json({data:await getUserData(user.id)});
});
