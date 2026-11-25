import { getSQL } from '@/lib/db';
import { decryptPaymentSecret } from './config';
import { verifyVnpayQuery } from './vnpay';
import type { OrderRow } from './orders';

export type IpnResult={RspCode:string;Message:string};
export const IPN={ok:{RspCode:'00',Message:'Confirm Success'},missing:{RspCode:'01',Message:'Order not found'},already:{RspCode:'02',Message:'Order already confirmed'},amount:{RspCode:'04',Message:'Invalid amount'},signature:{RspCode:'97',Message:'Invalid signature'},failed:{RspCode:'99',Message:'Unable to process notification'}} satisfies Record<string,IpnResult>;
export function validatePaymentFields(params:Record<string,string>,order:{reference:string;total_vnd:number|string},tmnCode:string):'valid'|'merchant'|'amount'|'malformed'{
 if(params.vnp_TmnCode!==tmnCode||params.vnp_TxnRef!==order.reference)return'merchant';
 if(!/^\d{1,12}$/.test(params.vnp_Amount||'')||params.vnp_Amount!==String(Number(order.total_vnd)*100))return'amount';
 if(!/^\d{2}$/.test(params.vnp_ResponseCode||'')||!/^\d{2}$/.test(params.vnp_TransactionStatus||''))return'malformed';
 if(params.vnp_CurrCode&&params.vnp_CurrCode!=='VND')return'malformed';
 if(params.vnp_ResponseCode==='00'&&params.vnp_TransactionStatus==='00'&&!/^(?!0+$)\d{1,32}$/.test(params.vnp_TransactionNo||''))return'malformed';
 return'valid';
}
export function isPaymentSuccess(params:Record<string,string>){return params.vnp_ResponseCode==='00'&&params.vnp_TransactionStatus==='00';}
export async function authenticateCallback(search:URLSearchParams):Promise<{order:OrderRow;params:Record<string,string>}|{failure:IpnResult}>{
 const refs=search.getAll('vnp_TxnRef');if(refs.length!==1||!/^[A-Za-z0-9]{1,40}$/.test(refs[0]))return{failure:IPN.signature};const sql=getSQL();
 const rows=await sql`SELECT o.*,c.tmn_code,c.secret_cipher FROM lowf_orders o JOIN lowf_payment_config c ON c.version=o.config_version WHERE o.reference=${refs[0]} LIMIT 1`;
 if(!rows[0])return{failure:IPN.missing};const row=rows[0];if(!row.secret_cipher)return{failure:IPN.signature};
 const verified=verifyVnpayQuery(search,decryptPaymentSecret(String(row.secret_cipher)));if(!verified.valid)return{failure:IPN.signature};
 const semantic=validatePaymentFields(verified.params,row as OrderRow,String(row.tmn_code));if(semantic==='amount')return{failure:IPN.amount};if(semantic!=='valid')return{failure:IPN.signature};
 return{order:row as OrderRow,params:verified.params};
}

/** The only code path that grants purchases. A browser return never calls this.
 * The order transition, one-time grant marker and all entitlements commit in one
 * SQL statement. A duplicate/racing IPN sees no transition and cannot extend a plan.
 */
export async function applyAuthenticatedNotification(order:OrderRow,params:Record<string,string>):Promise<IpnResult>{
 const sql=getSQL();
 if(isPaymentSuccess(params)){
  const status=order.mode==='production'?'paid':'sandbox_paid';
  const rows=await sql`WITH confirmed AS (
   UPDATE lowf_orders SET status=${status},gateway_transaction_no=${params.vnp_TransactionNo},gateway_response_code=${params.vnp_ResponseCode},paid_at=now(),updated_at=now()
   WHERE id=${order.id}::uuid AND status IN ('pending','expired','failed') RETURNING *
  ), grants AS (
   INSERT INTO lowf_order_grants(order_id) SELECT id FROM confirmed WHERE mode='production' AND status='paid' ON CONFLICT DO NOTHING RETURNING order_id
  ), books AS (
   INSERT INTO lowf_book_entitlements(user_id,book_id,order_id)
   SELECT c.user_id,item->>'id',c.id FROM confirmed c JOIN grants g ON g.order_id=c.id CROSS JOIN LATERAL jsonb_array_elements(c.items) item
   WHERE item->>'kind'='book' AND item->>'format' IN ('Ebook','Combo') ON CONFLICT DO NOTHING RETURNING book_id
  ), membership AS (
   INSERT INTO lowf_memberships(user_id,plan_id,status,access,expires_at)
   SELECT c.user_id,item->>'id','active','member',CASE item->>'interval' WHEN 'once' THEN NULL WHEN 'year' THEN now()+interval '1 year' ELSE now()+interval '1 month' END
   FROM confirmed c JOIN grants g ON g.order_id=c.id CROSS JOIN LATERAL jsonb_array_elements(c.items) item WHERE item->>'kind'='plan'
   ON CONFLICT(user_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status='active',access='member',expires_at=CASE
    WHEN EXCLUDED.expires_at IS NULL THEN NULL
    WHEN lowf_memberships.access='member' AND lowf_memberships.status='active' AND lowf_memberships.expires_at IS NULL THEN NULL
    ELSE GREATEST(now(),CASE WHEN lowf_memberships.status='active' AND lowf_memberships.access='member' THEN lowf_memberships.expires_at ELSE NULL END)+(SELECT CASE item->>'interval' WHEN 'year' THEN interval '1 year' ELSE interval '1 month' END FROM confirmed c CROSS JOIN LATERAL jsonb_array_elements(c.items) item WHERE c.user_id=EXCLUDED.user_id AND item->>'kind'='plan' AND item->>'id'=EXCLUDED.plan_id LIMIT 1) END,updated_at=now()
   RETURNING user_id
  ) SELECT id FROM confirmed`;
  return rows.length?IPN.ok:IPN.already;
 }
 // A signed failed/cancelled result is recorded, but can never downgrade a paid order.
 const rows=await sql`UPDATE lowf_orders SET status='failed',gateway_response_code=${params.vnp_ResponseCode},updated_at=now() WHERE id=${order.id}::uuid AND status IN ('pending','expired') RETURNING id`;
 return rows.length?IPN.ok:IPN.already;
}
