export { getCommerceStatus } from './config';
import { getSQL } from '@/lib/db';
export async function hasPurchasedBook(userId:string,bookId:string):Promise<boolean>{const sql=getSQL();const rows=await sql`SELECT 1 FROM lowf_book_entitlements e JOIN lowf_orders o ON o.id=e.order_id WHERE e.user_id=${userId} AND e.book_id=${bookId} AND o.status='paid' AND o.mode='production' LIMIT 1`;return rows.length>0;}
export async function getPurchasedBookIds(userId:string):Promise<string[]>{const sql=getSQL();const rows=await sql`SELECT DISTINCT e.book_id FROM lowf_book_entitlements e JOIN lowf_orders o ON o.id=e.order_id WHERE e.user_id=${userId} AND o.status='paid' AND o.mode='production'`;return rows.map(r=>String(r.book_id));}
