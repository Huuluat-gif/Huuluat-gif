import { getSQL } from './db';
import { HttpError } from './api';
export async function rateLimit(key:string,limit:number,windowSeconds:number){
 const sql=getSQL(); const rows=await sql`INSERT INTO lowf_rate_limits(key,hits,reset_at) VALUES(${key},1,now()+${windowSeconds}*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN lowf_rate_limits.reset_at<=now() THEN 1 ELSE lowf_rate_limits.hits+1 END,reset_at=CASE WHEN lowf_rate_limits.reset_at<=now() THEN now()+${windowSeconds}*interval '1 second' ELSE lowf_rate_limits.reset_at END RETURNING hits`;
 if(Number(rows[0].hits)>limit)throw new HttpError(429,'Bạn thao tác hơi nhanh. Vui lòng đợi một chút.','RATE_LIMITED');
}
