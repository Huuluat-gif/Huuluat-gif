import { requireUser } from '@/lib/auth/server';
import { assertSameOrigin,json,parseBody,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { checkoutSchema,createCheckout,listOrders } from '@/lib/commerce/orders';
export const dynamic='force-dynamic';
export const GET=route(async request=>{const user=await requireUser(),page=Math.max(1,Math.min(1000,Number(new URL(request.url).searchParams.get('page'))||1));return json(await listOrders(Math.floor(page),user.id));});
export const POST=route(async request=>{assertSameOrigin(request);const user=await requireUser();await rateLimit(`checkout:${user.id}`,20,3600);const body=await parseBody(request,checkoutSchema,16384);return json(await createCheckout(user,body,request),201);});
