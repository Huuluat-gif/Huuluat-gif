import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/server';
import { assertSameOrigin,json,parseBody,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { createSandboxTest } from '@/lib/commerce/orders';
import { assertMerchantCheckoutAvailable } from '@/lib/commerce/config';
export const POST=route(async request=>{assertSameOrigin(request);const user=await requireAdmin();assertMerchantCheckoutAvailable();await rateLimit(`sandbox-checkout:${user.id}`,20,3600);const body=await parseBody(request,z.object({idempotencyKey:z.uuid()}).strict(),1024);return json(await createSandboxTest(user,body.idempotencyKey,request),201);});
