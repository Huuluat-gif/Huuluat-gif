import assert from 'node:assert/strict';
const base=process.env.BASE_URL;
if(!base)throw new Error('BASE_URL is required');
const origin=new URL(base).origin;
const results=[];
async function request(path,options={}){
 const response=await fetch(new URL(path,base),{redirect:'manual',...options});
 const type=response.headers.get('content-type')||'';
 let json=null;
 if(type.includes('application/json'))json=await response.json();
 else await response.arrayBuffer();
 return {response,json};
}
async function check(name,fn){await fn();results.push(name);console.log('PASS',name)}
function mutation(body,foreign=false){return{method:'POST',headers:{'Content-Type':'application/json',Origin:foreign?'https://foreign.invalid':origin},body:JSON.stringify(body)}}
await check('public bootstrap is JSON and contains live collections',async()=>{const{response,json}=await request('/api/bootstrap');assert.equal(response.status,200);assert.ok(json&&typeof json==='object');for(const kind of ['books','tracks','videos','plans'])assert.ok(Array.isArray(json[kind]),kind);assert.ok(json.settings&&typeof json.settings==='object');for(const kind of ['books','tracks','videos','plans'])for(const item of json[kind])if(item.status)assert.equal(item.status,'published',`${kind} contains nonpublished content`);const text=JSON.stringify(json);for(const marker of ['BLOB_READ_WRITE_TOKEN','NEON_AUTH_COOKIE_SECRET','postgresql://','DATABASE_URL','owner_id'])assert.equal(text.includes(marker),false,`bootstrap leaks ${marker}`);if(process.env.EXPECT_COMMERCE_DISABLED==='1'&&json.commerce)assert.equal(json.commerce.enabled,false)});
await check('guest profile has no authenticated user',async()=>{const{response,json}=await request('/api/me');assert.equal(response.status,200);assert.ok(json);assert.ok(!json.user)});
for(const path of ['/api/admin/content/books','/api/admin/content/tracks','/api/admin/content/videos','/api/admin/content/plans','/api/admin/design','/api/admin/payments','/api/admin/orders','/api/admin/source','/api/orders','/api/reader/annotations?bookId=sample','/api/reader/vocabulary'])await check(`guest admin read rejected ${path}`,async()=>{const{response}=await request(path);assert.ok([401,403].includes(response.status),`got ${response.status}`)});
const writes=[
 ['/api/admin/payments',{mode:'disabled',tmnCode:'',shippingFeeVnd:0}],
 ['/api/admin/payments/test',{idempotencyKey:'d9e5c246-2641-41b8-8ea2-4c1c5aaaf703'}],
 ['/api/orders',{items:[],idempotencyKey:'d9e5c246-2641-41b8-8ea2-4c1c5aaaf703'}],
 ['/api/reader/annotations',{bookId:'sample',note:'Unauthorized QA request'}],
 ['/api/reader/vocabulary',{word:'book',translation:'sách',sourceLang:'en',targetLang:'vi'}],
 ['/api/user-data',{saved:[],progress:{}}],
 ['/api/reading',{action:'start',kind:'ambient'}],
 ['/api/messages',{text:'Unauthorized QA request'}],
 ['/api/membership',{planId:'free'}],
 ['/api/admin/design',{action:'publish'}],
 ['/api/uploads/finalize',{url:'https://invalid.example/qa.mp3',kind:'audio',originalName:'qa.mp3'}],
 ['/api/uploads',{type:'blob.generate-client-token',payload:{pathname:'lowf/guest/audio/47ca8487-8b4d-4949-b14a-13988cd22851.mp3',multipart:true,clientPayload:JSON.stringify({kind:'audio',originalName:'qa.mp3'})}}]
];
for(const[path,body]of writes)await check(`guest write rejected ${path}`,async()=>{const{response}=await request(path,mutation(body));assert.equal(response.status,401,`same-origin guest should reach auth, got ${response.status}`)});
for(const[path,body]of writes)await check(`cross-origin write rejected ${path}`,async()=>{const{response}=await request(path,mutation(body,true));assert.equal(response.status,403)});
await check('invalid asset identifier fails safely',async()=>{const{response}=await request('/api/assets/not-a-valid-id');assert.equal(response.status,404)});
console.log(`HTTP QA completed: ${results.length} checks; no authenticated writes or new accounts created.`);
