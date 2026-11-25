import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { assertSameOrigin,HttpError,json,parseBody,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { orderView,type OrderRow } from '@/lib/commerce/orders';
export const PATCH=route(async(request,ctx:{params:Promise<{id:string}>})=>{assertSameOrigin(request);const user=await requireAdmin();await rateLimit(`fulfillment:${user.id}`,60,60);const id=z.uuid().parse((await ctx.params).id),body=await parseBody(request,z.object({fulfillmentStatus:z.enum(['unfulfilled','processing','shipped','completed'])}).strict(),1024);const sql=getSQL();const rows=await sql`UPDATE lowf_orders SET fulfillment_status=${body.fulfillmentStatus},updated_at=now() WHERE id=${id}::uuid AND status='paid' AND mode='production' RETURNING *`;if(!rows[0])throw new HttpError(409,'Chỉ xử lý giao hàng cho đơn đã được VNPAY xác nhận thanh toán thật.');return json({order:orderView(rows[0] as OrderRow,true)});});
