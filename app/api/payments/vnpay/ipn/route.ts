import { json } from '@/lib/api';
import { applyAuthenticatedNotification,authenticateCallback,IPN } from '@/lib/commerce/ipn';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{if(request.url.length>20000)return json(IPN.signature);const result=await authenticateCallback(new URL(request.url).searchParams);if('failure' in result)return json(result.failure);return json(await applyAuthenticatedNotification(result.order,result.params));}catch(error){console.error('[Lowf VNPAY] IPN could not be committed',{type:error instanceof Error?error.name:'UnknownError'});return json(IPN.failed);}}
