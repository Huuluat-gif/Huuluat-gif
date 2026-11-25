import { z } from 'zod';
import { requireUser } from '@/lib/auth/server';
import { json,route } from '@/lib/api';
import { orderView,readOrder } from '@/lib/commerce/orders';
export const dynamic='force-dynamic';
export const GET=route(async(_request,ctx:{params:Promise<{id:string}>})=>{const user=await requireUser(),id=z.uuid().parse((await ctx.params).id);return json({order:orderView(await readOrder(id,user.id))});});
