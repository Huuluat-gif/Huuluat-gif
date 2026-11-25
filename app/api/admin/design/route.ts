import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route,json,assertSameOrigin,parseBody,HttpError } from '@/lib/api';
import { designSchema,type DesignSettings } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),settings:designSchema}).strict(),
 z.object({action:z.literal('publish'),versionId:z.uuid().optional()}).strict(),
 z.object({action:z.literal('restore'),versionId:z.uuid()}).strict()
]);
async function snapshot(){const sql=getSQL();const rows=await sql`SELECT id,settings,status,created_at FROM lowf_design_versions WHERE status IN ('draft','published') OR id IN (SELECT id FROM lowf_design_versions ORDER BY created_at DESC LIMIT 100) ORDER BY created_at DESC`;const versions=rows.map(r=>({id:r.id,settings:r.settings,status:r.status,createdAt:r.created_at}));return{draft:versions.find(v=>v.status==='draft')||null,published:versions.find(v=>v.status==='published')||null,versions};}
async function checkImage(settings:DesignSettings,userId:string){const id=settings.hero.imageAssetId;if(!id)return;const rows=await getSQL()`SELECT owner_id,kind FROM lowf_assets WHERE id=${id}::uuid`;if(!rows[0]||rows[0].kind!=='image'||![userId,'system'].includes(rows[0].owner_id))throw new HttpError(400,'Ảnh đầu trang chưa được tải lên hợp lệ.');}
export const dynamic='force-dynamic';
export const GET=route(async()=>{await requireAdmin();return json(await snapshot());});
export const POST=route(async request=>{
 assertSameOrigin(request);const user=await requireAdmin();await rateLimit(`design:${user.id}`,30,60);const body=await parseBody(request,schema),sql=getSQL();
 if(body.action==='save'){
  await checkImage(body.settings,user.id);
  await sql.transaction(tx=>[
   tx`SELECT pg_advisory_xact_lock(741209)`,
   tx`UPDATE lowf_design_versions SET status='historical' WHERE status='draft'`,
   tx`INSERT INTO lowf_design_versions(id,settings,status,created_by) VALUES(${randomUUID()}::uuid,${JSON.stringify(body.settings)}::jsonb,'draft',${user.id})`
  ]);
 }else{
  const versions=body.versionId?await sql`SELECT id,settings FROM lowf_design_versions WHERE id=${body.versionId}::uuid`:await sql`SELECT id,settings FROM lowf_design_versions WHERE status IN ('draft','published') ORDER BY CASE WHEN status='draft' THEN 0 ELSE 1 END,created_at DESC LIMIT 1`;
  if(!versions[0])throw new HttpError(404,'Không tìm thấy phiên bản giao diện.');
  const settings=designSchema.parse(versions[0].settings);await checkImage(settings,user.id);
  await sql.transaction(tx=>[
   tx`SELECT pg_advisory_xact_lock(741209)`,
   tx`UPDATE lowf_design_versions SET status='historical' WHERE status IN ('draft','published')`,
   tx`INSERT INTO lowf_design_versions(id,settings,status,created_by) VALUES(${randomUUID()}::uuid,${JSON.stringify(settings)}::jsonb,'published',${user.id})`
  ]);
 }
 return json(await snapshot());
});
