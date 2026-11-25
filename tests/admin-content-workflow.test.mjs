import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';

// Run the actual CRUD/design handlers and PostgreSQL statements locally. Only
// authentication and commerce availability are fixtures; no external service or
// production database is contacted, and no real owner identity is impersonated.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=await mkdtemp(path.join(root,'tests/.admin-content-'));
const database=new PGlite();
const owner={id:'isolated-owner',email:'owner@example.test',emailVerified:true,isAdmin:true};
let user=owner,commerceEnabled=false;
function query(strings,values){return {sql:strings.reduce((sql,part,i)=>sql+(i?`$${i}`:'')+part,''),params:values};}
const sql=async(strings,...values)=>{const q=query(strings,values);return(await database.query(q.sql,q.params)).rows};
sql.transaction=async callback=>database.transaction(async tx=>{const statements=callback((strings,...values)=>query(strings,values));const results=[];for(const q of statements)results.push((await tx.query(q.sql,q.params)).rows);return results});
globalThis.__lowfAdminWorkflow={getSQL:()=>sql,getUser:()=>user,getCommerce:()=>({enabled:commerceEnabled})};
await build({stdin:{contents:`export {GET as listContent,POST as createContent} from './app/api/admin/content/[kind]/route';
export {PATCH as editContent,DELETE as archiveContent} from './app/api/admin/content/[kind]/[id]/route';
export {GET as getDesign,POST as saveDesign} from './app/api/admin/design/route';
export {defaultDesign} from './lib/validation';`,resolveDir:root,loader:'ts'},outfile:path.join(temporary,'routes.cjs'),bundle:true,packages:'external',platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'local-boundaries',setup(plugin){
plugin.onResolve({filter:/^(?:@\/lib\/|\.\/)(?:db|auth\/server|commerce)$/},args=>({path:args.path.split('/').at(-1),namespace:'local-boundary'}));
plugin.onLoad({filter:/.*/,namespace:'local-boundary'},args=>({loader:'js',resolveDir:root,contents:args.path==='db'?`export function getSQL(){return globalThis.__lowfAdminWorkflow.getSQL()}`:args.path==='commerce'?`export async function getCommerceStatus(){return globalThis.__lowfAdminWorkflow.getCommerce()}`:`import {HttpError} from ${JSON.stringify(path.join(root,'lib/api.ts'))};export async function requireAdmin(){const user=globalThis.__lowfAdminWorkflow.getUser();if(!user)throw new HttpError(401,'Login required');if(!user.isAdmin||!user.emailVerified)throw new HttpError(403,'Owner required');return user;}`}));
}}]});
const routes=createRequire(import.meta.url)(path.join(temporary,'routes.cjs'));
const source=await readFile(path.join(root,'scripts/db-init.ts'),'utf8');
const block=source.match(/const statements\s*=\s*\[([\s\S]*?)\];/);assert.ok(block);
for(const match of block[1].matchAll(/`([^`]*)`/g)){assert.ok(!match[1].includes('${'));await database.exec(match[1]);}
after(async()=>{delete globalThis.__lowfAdminWorkflow;await database.close();await rm(temporary,{recursive:true,force:true})});
beforeEach(async()=>{user=owner;commerceEnabled=false;await database.exec('TRUNCATE lowf_content,lowf_assets,lowf_design_versions,lowf_rate_limits')});
function request(pathname,body,method='POST'){return new Request('https://lowf.test'+pathname,{method,headers:{Origin:'https://lowf.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})}
function context(kind,id){return {params:Promise.resolve({kind,...(id?{id}:{})})}}
const book=(patch={})=>({title:'A local test book',author:'Test author',category:'vanhocqt',format:'Ebook Free',price:0,description:'',sourceUrl:'',licenseLabel:'',access:'free',status:'draft',...patch});
const video=(patch={})=>({title:'A local video',sourceKind:'youtube',youtubeUrl:'',source:'',license:'',attribution:'',status:'draft',...patch});
const track=(patch={})=>({title:'A local track',license:'Original recording',source:'',attribution:'',access:'free',status:'draft',...patch});
async function row(kind,id){return(await database.query('SELECT * FROM lowf_content WHERE kind=$1 AND id=$2',[kind,id])).rows[0]}
async function seedAsset(kind,ownerId=owner.id){const id=randomUUID();await database.query('INSERT INTO lowf_assets(id,owner_id,pathname,kind,content_type,byte_size,original_name) VALUES($1,$2,$3,$4,$5,100,$6)',[id,ownerId,`fixture/${id}`,kind,kind==='pdf'?'application/pdf':kind==='audio'?'audio/mpeg':'image/png',`fixture.${kind}`]);return id}

test('guest and ordinary readers cannot call content or design management',async()=>{
for(const identity of [null,{...owner,isAdmin:false},{...owner,emailVerified:false}]){user=identity;const status=identity?403:401;assert.equal((await routes.listContent(request('/api/admin/content/books',undefined,'GET'),context('books'))).status,status);assert.equal((await routes.createContent(request('/api/admin/content/books',book()),context('books'))).status,status);assert.equal((await routes.getDesign(request('/api/admin/design',undefined,'GET'))).status,status)}
});
test('a YouTube draft saves without a link, later publishes, and can clear its old video ID',async()=>{
let response=await routes.createContent(request('/api/admin/content/videos',video()),context('videos'));assert.equal(response.status,201);const id=(await response.json()).item.id;
response=await routes.editContent(request('/api/admin/content/videos/'+id,{status:'published'},'PATCH'),context('videos',id));assert.equal(response.status,400);assert.equal((await row('videos',id)).status,'draft');
response=await routes.editContent(request('/api/admin/content/videos/'+id,{youtubeUrl:'https://youtu.be/jfKfPfyJRdk',status:'published'},'PATCH'),context('videos',id));assert.equal(response.status,200);assert.equal((await response.json()).item.youtubeId,'jfKfPfyJRdk');
response=await routes.editContent(request('/api/admin/content/videos/'+id,{youtubeUrl:'',status:'draft'},'PATCH'),context('videos',id));assert.equal(response.status,200);const item=(await response.json()).item;assert.equal(item.youtubeId,undefined);assert.equal(item.youtubeUrl,'');
for(const youtubeUrl of ['https://evil.invalid/watch?v=jfKfPfyJRdk','http://youtube.com/watch?v=jfKfPfyJRdk'])assert.equal((await routes.createContent(request('/api/admin/content/videos',video({youtubeUrl})),context('videos'))).status,400);
});
test('optional URL fields accept empty strings and malformed URLs return validation errors instead of service failures',async()=>{
for(const sourceUrl of ['','https://example.test/book'])assert.equal((await routes.createContent(request('/api/admin/content/books',book({sourceUrl})),context('books'))).status,201);
for(const sourceUrl of ['not a url','http://example.test/book'])assert.equal((await routes.createContent(request('/api/admin/content/books',book({sourceUrl})),context('books'))).status,400);
for(const source of ['','https://example.test/audio'])assert.equal((await routes.createContent(request('/api/admin/content/tracks',track({source,licenseUrl:''})),context('tracks'))).status,201);
assert.equal((await routes.createContent(request('/api/admin/content/videos',video({source:'bad'})),context('videos'))).status,400);
});
test('editing imported book metadata preserves every chapter without sending it through the form',async()=>{
const chapters=[{title:'First',paragraphs:['A'.repeat(10000),'B'.repeat(10000)]},{title:'Second',paragraphs:['End']}],id='imported-fixture',item=book({id,chapters,status:'published'});
await database.query("INSERT INTO lowf_content(kind,id,data,status) VALUES('books',$1,$2::jsonb,'published')",[id,JSON.stringify(item)]);
const listing=await(await routes.listContent(request('/api/admin/content/books',undefined,'GET'),context('books'))).json();assert.equal(listing.items[0].chapterCount,2);assert.equal(listing.items[0].chapters,undefined);
const response=await routes.editContent(request('/api/admin/content/books/'+id,{title:'Edited title',language:'en'},'PATCH'),context('books',id));assert.equal(response.status,200);assert.equal((await response.json()).item.chapters,undefined);assert.deepEqual((await row('books',id)).data.chapters,chapters);
assert.equal((await routes.archiveContent(request('/api/admin/content/books/'+id,undefined,'DELETE'),context('books',id))).status,200);assert.equal((await row('books',id)).status,'archived');
assert.equal((await routes.editContent(request('/api/admin/content/books/'+id,{status:'published'},'PATCH'),context('books',id))).status,200);assert.deepEqual((await row('books',id)).data.chapters,chapters);
});
test('published ebooks need content and uploaded file ownership and kind are checked',async()=>{
assert.equal((await routes.createContent(request('/api/admin/content/books',book({status:'published'})),context('books'))).status,400);
const own=await seedAsset('pdf'),foreign=await seedAsset('pdf','someone-else'),wrongKind=await seedAsset('audio');
for(const pdfAssetId of [foreign,wrongKind,randomUUID()])assert.equal((await routes.createContent(request('/api/admin/content/books',book({status:'published',pdfAssetId})),context('books'))).status,400);
assert.equal((await routes.createContent(request('/api/admin/content/books',book({status:'published',pdfAssetId:own})),context('books'))).status,201);
assert.equal((await routes.createContent(request('/api/admin/content/books',book({status:'published',format:'Sách giấy'})),context('books'))).status,201);
});
test('audio can be saved as draft, published after upload, edited, and archived without deleting its file',async()=>{
const response=await routes.createContent(request('/api/admin/content/tracks',track()),context('tracks'));assert.equal(response.status,201);const id=(await response.json()).item.id;
assert.equal((await routes.editContent(request('/api/admin/content/tracks/'+id,{status:'published'},'PATCH'),context('tracks',id))).status,400);
const assetId=await seedAsset('audio');assert.equal((await routes.editContent(request('/api/admin/content/tracks/'+id,{assetId,status:'published'},'PATCH'),context('tracks',id))).status,200);
assert.equal((await routes.editContent(request('/api/admin/content/tracks/'+id,{title:'Updated audio',description:'Updated description'},'PATCH'),context('tracks',id))).status,200);
assert.equal((await routes.archiveContent(request('/api/admin/content/tracks/'+id,undefined,'DELETE'),context('tracks',id))).status,200);assert.equal((await row('tracks',id)).data.assetId,assetId);assert.equal((await database.query('SELECT 1 FROM lowf_assets WHERE id=$1',[assetId])).rows.length,1);
});
test('archiving a free plan switches registration off and paid plans cannot activate without commerce',async()=>{
const plan={name:'Free fixture',description:'',price:0,interval:'once',features:[],enabled:true,status:'published'};
const response=await routes.createContent(request('/api/admin/content/plans',plan),context('plans'));assert.equal(response.status,201);const id=(await response.json()).item.id;
assert.equal((await routes.archiveContent(request('/api/admin/content/plans/'+id,undefined,'DELETE'),context('plans',id))).status,200);assert.equal((await row('plans',id)).data.enabled,false);
assert.equal((await routes.createContent(request('/api/admin/content/plans',{...plan,price:49000}),context('plans'))).status,409);
const draft=await routes.createContent(request('/api/admin/content/plans',{...plan,price:49000,status:'draft'}),context('plans'));assert.equal(draft.status,201);assert.equal((await draft.json()).item.enabled,false);
});
test('saving a design does not publish it, publishing and restoring persist exact settings',async()=>{
const original={...routes.defaultDesign,brand:{name:'Original',tagline:'Local fixture'}};
let response=await routes.saveDesign(request('/api/admin/design',{action:'save',settings:original}));assert.equal(response.status,200);let data=await response.json();assert.equal(data.published,null);const originalId=data.draft.id;
response=await routes.saveDesign(request('/api/admin/design',{action:'publish',versionId:originalId}));assert.equal(response.status,200);data=await response.json();assert.equal(data.published.settings.brand.name,'Original');const publishedId=data.published.id;
const edited={...original,brand:{name:'Edited',tagline:'Local fixture'}};data=await(await routes.saveDesign(request('/api/admin/design',{action:'save',settings:edited}))).json();assert.equal(data.published.settings.brand.name,'Original');assert.equal(data.draft.settings.brand.name,'Edited');
data=await(await routes.saveDesign(request('/api/admin/design',{action:'publish',versionId:data.draft.id}))).json();assert.equal(data.published.settings.brand.name,'Edited');
data=await(await routes.saveDesign(request('/api/admin/design',{action:'restore',versionId:publishedId}))).json();assert.equal(data.published.settings.brand.name,'Original');assert.equal((await database.query("SELECT count(*)::int AS n FROM lowf_design_versions WHERE status='published'")).rows[0].n,1);
});
test('active published design remains visible after more than one hundred later drafts',async()=>{
const settings=routes.defaultDesign,oldId=randomUUID();await database.query("INSERT INTO lowf_design_versions(id,settings,status,created_by,created_at) VALUES($1,$2::jsonb,'published','fixture',now()-interval '1 year')",[oldId,JSON.stringify(settings)]);
for(let i=0;i<105;i++)await database.query("INSERT INTO lowf_design_versions(id,settings,status,created_by) VALUES($1,$2::jsonb,'historical','fixture')",[randomUUID(),JSON.stringify(settings)]);
const draftId=randomUUID();await database.query("INSERT INTO lowf_design_versions(id,settings,status,created_by) VALUES($1,$2::jsonb,'draft','fixture')",[draftId,JSON.stringify(settings)]);
const response=await routes.getDesign(request('/api/admin/design',undefined,'GET'));assert.equal(response.status,200);const data=await response.json();assert.equal(data.published.id,oldId);assert.equal(data.draft.id,draftId);assert.ok(data.versions.length<=102);
});
