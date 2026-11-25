// Explicit opt-in parity test for the dedicated Preview database. Authentication
// is a LOCAL fixture only; these handlers/server mocks are never deployed.
// All mutations use unique QA content IDs, deleted in finally. No production
// connection, user account, email, payment or Blob file is read or modified.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { build } from 'esbuild';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.LOWF_RUN_PREVIEW_QA!=='1')throw new Error('Set LOWF_RUN_PREVIEW_QA=1 to run the isolated Preview database test.');
const env=parse(await readFile(path.join(root,'.env.preview.local')));
const url=new URL(env.LOWF_PREVIEW_DATABASE_URL||'');
assert.equal(url.pathname,'/lowf_preview');assert.equal(decodeURIComponent(url.username),'lowf_preview_app');
const adminSQL=neon(url.toString());
const [identity]=await adminSQL`SELECT current_database() AS db,current_user AS role`;
assert.equal(identity.db,'lowf_preview');assert.equal(identity.role,'lowf_preview_app');
const suffix=randomUUID(),ownerId='qa-local-'+suffix,ids={videos:'qa-video-'+suffix,books:'qa-book-'+suffix,tracks:'qa-audio-'+suffix,plans:'qa-plan-'+suffix};
const temporary=await mkdtemp(path.join(root,'tests/.preview-admin-'));
try{
 const sql=adminSQL;
 globalThis.__lowfPreviewWorkflowSQL=sql;
 await build({stdin:{contents:`export {POST as createContent,GET as listContent} from './app/api/admin/content/[kind]/route';
export {PATCH as editContent,DELETE as archiveContent} from './app/api/admin/content/[kind]/[id]/route';
`,resolveDir:root,loader:'ts'},outfile:path.join(temporary,'routes.cjs'),bundle:true,packages:'external',platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'local-preview-only-fixtures',setup(plugin){
 plugin.onResolve({filter:/^(?:@\/lib\/|\.\/)(?:db|auth\/server|commerce)$/},args=>({path:args.path.split('/').at(-1),namespace:'local-preview'}));
 plugin.onLoad({filter:/.*/,namespace:'local-preview'},args=>({loader:'js',resolveDir:root,contents:args.path==='db'?`export function getSQL(){return globalThis.__lowfPreviewWorkflowSQL}`:args.path==='commerce'?`export async function getCommerceStatus(){return{enabled:false}}`:`export async function requireAdmin(){return{id:${JSON.stringify(ownerId)},email:'qa@example.test',emailVerified:true,isAdmin:true}}`}));
 }}]});
 const routes=createRequire(import.meta.url)(path.join(temporary,'routes.cjs'));
 const request=(body,method='POST')=>new Request('https://preview-qa.invalid/api/admin/content',{method,headers:{Origin:'https://preview-qa.invalid','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const context=(kind,id)=>({params:Promise.resolve({kind,...(id?{id}:{})})});
 const video={id:ids.videos,title:'Preview QA video',sourceKind:'youtube',youtubeUrl:'',source:'',license:'',attribution:'',status:'draft'};
 let response=await routes.createContent(request(video),context('videos'));assert.equal(response.status,201);
 response=await routes.editContent(request({status:'published',youtubeUrl:'https://youtu.be/jfKfPfyJRdk'},'PATCH'),context('videos',ids.videos));assert.equal(response.status,200);assert.equal((await response.json()).item.youtubeId,'jfKfPfyJRdk');
 const book={id:ids.books,title:'Preview QA book',author:'Local fixture',category:'vanhocqt',format:'Ebook Free',price:0,description:'',sourceUrl:'',licenseLabel:'',access:'free',status:'published',chapters:[{title:'One',paragraphs:['Original test paragraph.']}]};
 response=await routes.createContent(request(book),context('books'));assert.equal(response.status,201);
 response=await routes.editContent(request({title:'Edited preview book'},'PATCH'),context('books',ids.books));assert.equal(response.status,200);assert.equal((await response.json()).item.chapterCount,1);
 const [saved]=await sql`SELECT data FROM lowf_content WHERE kind='books' AND id=${ids.books}`;assert.equal(saved.data.chapters[0].paragraphs[0],'Original test paragraph.');
 response=await routes.archiveContent(request(undefined,'DELETE'),context('books',ids.books));assert.equal(response.status,200);
 response=await routes.editContent(request({status:'published'},'PATCH'),context('books',ids.books));assert.equal(response.status,200);
 const audio={id:ids.tracks,title:'Preview QA audio',source:'',license:'Original',licenseUrl:'',attribution:'',access:'free',status:'draft'};
 assert.equal((await routes.createContent(request(audio),context('tracks'))).status,201);
 const free={id:ids.plans,name:'Preview QA free plan',description:'',price:0,interval:'once',features:[],enabled:true,status:'published'};
 assert.equal((await routes.createContent(request(free),context('plans'))).status,201);
 assert.equal((await routes.archiveContent(request(undefined,'DELETE'),context('plans',ids.plans))).status,200);
 assert.equal((await sql`SELECT data->>'enabled' AS enabled FROM lowf_content WHERE kind='plans' AND id=${ids.plans}`)[0].enabled,'false');
 console.log('PASS actual Neon Preview SQL: create/edit/publish/archive/restore books, YouTube drafts, audio drafts, plan registration.');

}finally{
 delete globalThis.__lowfPreviewWorkflowSQL;
 for(const [kind,id]of Object.entries(ids))await adminSQL`DELETE FROM lowf_content WHERE kind=${kind} AND id=${id}`;
 await adminSQL`DELETE FROM lowf_rate_limits WHERE key=${'admin:'+ownerId}`;
 await rm(temporary,{recursive:true,force:true});
 console.log('Removed only the uniquely identified Preview QA content/rate-limit rows; seeded content and production were unchanged.');
}
