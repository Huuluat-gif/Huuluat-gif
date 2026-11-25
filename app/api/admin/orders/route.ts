import { requireAdmin } from '@/lib/auth/server';
import { json,route } from '@/lib/api';
import { listOrders } from '@/lib/commerce/orders';
export const dynamic='force-dynamic';
export const GET=route(async request=>{await requireAdmin();const page=Math.max(1,Math.min(1000,Number(new URL(request.url).searchParams.get('page'))||1));return json(await listOrders(Math.floor(page)));});
