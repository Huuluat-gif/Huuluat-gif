import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireUser } from '@/lib/auth/server';
import { json,route,assertSameOrigin,parseBody,HttpError } from '@/lib/api';
import { getMembership } from '@/lib/membership';
import { getCommerceStatus } from '@/lib/commerce';
import { idSchema } from '@/lib/validation';
export const POST=route(async request=>{assertSameOrigin(request);const user=await requireUser();const body=await parseBody(request,z.object({planId:idSchema}).strict());const sql=getSQL(),rows=await sql`SELECT data,status FROM lowf_content WHERE kind='plans' AND id=${body.planId}`;const plan=rows[0];if(!plan)throw new HttpError(404,'Không tìm thấy gói.');if(Number(plan.data.price)>0){if((await getCommerceStatus()).enabled)throw new HttpError(402,'Hãy thanh toán gói qua VNPAY; quyền đọc được mở sau khi máy chủ nhận xác nhận.','CHECKOUT_REQUIRED');throw new HttpError(503,'Gói trả phí chưa mở đăng ký vì chưa kết nối đơn vị thanh toán.','PAYMENTS_NOT_CONNECTED');}if(plan.status!=='published'||plan.data.enabled!==true)throw new HttpError(409,'Gói này chưa mở đăng ký.');await sql`INSERT INTO lowf_memberships(user_id,plan_id,status,access) VALUES(${user.id},${body.planId},'active','free') ON CONFLICT(user_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status='active',access='free',expires_at=NULL,updated_at=now() WHERE lowf_memberships.access='free' OR lowf_memberships.status<>'active' OR lowf_memberships.expires_at<=now()`;return json({membership:await getMembership(user.id)});});
