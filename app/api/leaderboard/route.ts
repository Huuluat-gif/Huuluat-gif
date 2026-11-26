import { getSQL } from '@/lib/db';
import { json,route,dayKey,initials } from '@/lib/api';
import { ensureProfileAvatarColumn } from '@/lib/auth/server';
export const dynamic='force-dynamic';
export const GET=route(async()=>{
 await ensureProfileAvatarColumn();
 const sql=getSQL(),month=dayKey().slice(0,7),start=`${month}-01`;
 const rows=await sql`SELECT p.user_id,p.display_name,p.avatar_url,SUM(d.seconds)::bigint seconds,(SELECT COALESCE(SUM(a.seconds),0) FROM lowf_reading_days a WHERE a.user_id=p.user_id)::bigint all_seconds FROM lowf_profiles p JOIN lowf_reading_days d ON d.user_id=p.user_id WHERE d.day>=${start}::date AND d.day<${start}::date+interval '1 month' GROUP BY p.user_id,p.display_name,p.avatar_url HAVING SUM(d.seconds)>0 ORDER BY seconds DESC,p.user_id LIMIT 20`;
 return json({month,readers:rows.map(r=>({id:r.user_id,name:r.display_name,initials:initials(r.display_name),avatar:r.avatar_url||'',seconds:Number(r.seconds),hours:Math.round(Number(r.seconds)/360)/10,level:Math.floor(Math.floor(Number(r.all_seconds)/60)*10/1000)+1}))});
});
