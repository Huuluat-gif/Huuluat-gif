import { APP_ORIGIN } from '@/lib/commerce/config';
import { authenticateCallback } from '@/lib/commerce/ipn';
export const dynamic='force-dynamic';
export async function GET(request:Request){const destination=new URL('/',APP_ORIGIN);destination.searchParams.set('view','orders');destination.searchParams.set('payment','invalid');try{if(request.url.length<=20000){const result=await authenticateCallback(new URL(request.url).searchParams);if(!('failure' in result)){destination.searchParams.set('payment','returned');destination.searchParams.set('order',result.order.id);}}}catch{}return new Response(null,{status:303,headers:{Location:destination.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
