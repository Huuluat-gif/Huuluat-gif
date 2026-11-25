import { getSQL } from '@/lib/db';
import { getUser } from '@/lib/auth/server';
import { json,route,HttpError } from '@/lib/api';
import { hasMembership } from '@/lib/membership';
import { publicItem } from '@/lib/content';
import { idSchema } from '@/lib/validation';
import { hasPurchasedBook } from '@/lib/commerce';
export const dynamic='force-dynamic';
export const GET=route(async(_request,context:{params:Promise<{id:string}>})=>{const {id}=await context.params;idSchema.parse(id);const sql=getSQL(),rows=await sql`SELECT kind,id,data,status FROM lowf_content WHERE kind='books' AND id=${id} AND status='published'`;if(!rows[0])throw new HttpError(404,'Không tìm thấy sách.');const user=await getUser(),entitled=!!user&&(user.isAdmin||await hasMembership(user.id)||await hasPurchasedBook(user.id,id));if(rows[0].data.access==='member'&&!entitled)throw new HttpError(403,'Cần mua sách hoặc có gói thành viên phù hợp để đọc.','MEMBERSHIP_REQUIRED');return json({book:publicItem(rows[0],entitled)});});
