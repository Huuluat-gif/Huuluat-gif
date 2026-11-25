import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
const sql=neon(process.env.DATABASE_URL!);
const manifest=JSON.parse(await readFile('/workspace/work/lowf-assets/audio-manifest.json','utf8'));
const tracks=manifest.tracks;
if(!Array.isArray(tracks))throw new Error('Missing tracks manifest');
for(const t of tracks){
 const bytes=await readFile(t.localPath);
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,14);
 const pathname=`lowf/system/audio/${t.id}-${hash}.mp3`;
 const existing=await sql`select id from lowf_assets where pathname=${pathname}`;
 let assetId=existing[0]?.id;
 if(!assetId){
  await put(pathname,bytes,{access:'private',addRandomSuffix:false,contentType:'audio/mpeg',allowOverwrite:false});
  assetId=randomUUID();
  await sql`insert into lowf_assets (id,owner_id,pathname,kind,content_type,byte_size,original_name) values (${assetId},'system',${pathname},'audio','audio/mpeg',${bytes.length},${t.title+'.mp3'})`;
 }
 const id=t.id;
 const data={id,title:t.title,artist:t.artist||t.performer,description:t.labelVi||'Piano dành cho những phút tập trung',assetId,license:t.license,licenseUrl:t.licenseUrl,source:t.sourceUrl,attribution:t.attribution,durationSeconds:t.durationSeconds,access:'free',status:'published'};
 await sql`insert into lowf_content (kind,id,data,status) values ('tracks',${id},${JSON.stringify(data)}::jsonb,'published') on conflict (kind,id) do update set data=excluded.data,status='published',updated_at=now()`;
 console.log('Published licensed track:',t.title);
}
console.log('Music seed complete:',tracks.length);
}
main().catch(e=>{console.error('Music import failed:',e.name);process.exitCode=1;});
