import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireUser,syncProfile } from '@/lib/auth/server';
import { json,route,assertSameOrigin,parseBody,dayKey,HttpError } from '@/lib/api';
import { getUserData,statsFor } from '@/lib/user-data';
import { idSchema } from '@/lib/validation';
import { hasMembership } from '@/lib/membership';
import { rateLimit } from '@/lib/rate-limit';
import { hasPurchasedBook } from '@/lib/commerce';
const schema=z.object({active:z.boolean(),bookId:idSchema.optional(),source:z.enum(['reader','audio']),sessionId:z.uuid()}).strict();
export const POST=route(async request=>{
 assertSameOrigin(request);const user=await requireUser();await rateLimit(`reading:${user.id}`,20,60);const body=await parseBody(request,schema);const sql=getSQL();
 if(body.active&&body.source==='reader'&&body.bookId){const rows=await sql`SELECT data FROM lowf_content WHERE kind='books' AND id=${body.bookId} AND status='published'`;if(!rows.length)throw new HttpError(404,'Không tìm thấy sách.');if(rows[0].data.access==='member'&&!user.isAdmin&&!await hasMembership(user.id)&&!await hasPurchasedBook(user.id,body.bookId))throw new HttpError(403,'Cần mua sách hoặc có gói thành viên phù hợp để đọc.');}
 await syncProfile(user);
 const day=dayKey();
 const results=await sql.transaction(tx=>[
 tx`INSERT INTO lowf_reading_clock(user_id,session_id,last_ping,active) VALUES(${user.id},${body.sessionId}::uuid,now(),false) ON CONFLICT(user_id) DO NOTHING`,
 tx`WITH previous AS (SELECT * FROM lowf_reading_clock WHERE user_id=${user.id} FOR UPDATE), tick AS (
  UPDATE lowf_reading_clock clock SET session_id=${body.sessionId}::uuid,last_ping=now(),active=${body.active}
  FROM previous p WHERE clock.user_id=p.user_id AND (p.session_id=${body.sessionId}::uuid OR p.active=false OR p.last_ping<now()-interval '40 seconds')
  RETURNING CASE WHEN p.active AND p.session_id=${body.sessionId}::uuid AND p.last_ping>=now()-interval '40 seconds' THEN LEAST(30,GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (now()-p.last_ping)))::int)) ELSE 0 END AS added
 ), credited AS (
  INSERT INTO lowf_reading_days(user_id,day,seconds) SELECT ${user.id},${day}::date,added FROM tick
  ON CONFLICT(user_id,day) DO UPDATE SET seconds=LEAST(86400,lowf_reading_days.seconds+EXCLUDED.seconds) RETURNING seconds
 ) SELECT COALESCE((SELECT added FROM tick),0) AS added_seconds`
 ]);
 const data=await getUserData(user.id);return json({addedSeconds:Number(results[1][0]?.added_seconds||0),stats:statsFor(data.secondsByDay),secondsByDay:data.secondsByDay});
});
