import { requireAdmin } from '@/lib/auth/server';
import { assertSameOrigin,json,parseBody,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { getAdminPaymentSettings,paymentConfigSchema,savePaymentConfig } from '@/lib/commerce/config';
export const dynamic='force-dynamic';
export const GET=route(async()=>{await requireAdmin();return json(await getAdminPaymentSettings());});
export const POST=route(async request=>{assertSameOrigin(request);const user=await requireAdmin();await rateLimit(`payment-settings:${user.id}`,20,3600);const body=await parseBody(request,paymentConfigSchema,4096);return json(await savePaymentConfig(body,user.id));});
