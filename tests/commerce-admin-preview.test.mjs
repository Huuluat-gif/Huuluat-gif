import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { after, beforeEach, test } from 'node:test';
import { build } from 'esbuild';

// Exercise the production config, order entry points, and route wrapper. These
// fixtures record every SQL attempt; no environment credentials or network used.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=await mkdtemp(path.join(root,'tests/.commerce-admin-preview-'));
const originalEnv=process.env.VERCEL_ENV,originalSecret=process.env.NEON_AUTH_COOKIE_SECRET;
process.env.NEON_AUTH_COOKIE_SECRET='isolated-preview-test-root-secret-32-characters';
const state={user:null,reads:[],rateCalls:0,authCalls:0,config:null,order:null};
globalThis.__lowfPreviewCommerce=state;
globalThis.__lowfPreviewSQL=async(strings,...values)=>{
 const query=strings.join('?');state.reads.push(query);
 if(query.includes('lowf_payment_config'))return state.config?[state.config]:[];
 if(query.startsWith('SELECT * FROM lowf_orders'))return state.order?[state.order]:[];
 throw new Error('Unexpected SQL reached: '+query);
};
await build({stdin:{contents:`export {getAdminPaymentSettings,getCommerceStatus,encryptPaymentSecret} from './lib/commerce/config';export {createCheckout,createSandboxTest} from './lib/commerce/orders';export {POST as testRoute} from './app/api/admin/payments/test/route';`,resolveDir:root,sourcefile:'preview-guard-test.ts',loader:'ts'},outfile:path.join(temporary,'bundle.cjs'),bundle:true,packages:'external',platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'fixtures',setup(plugin){
 plugin.onResolve({filter:/^@\/lib\/(db|auth\/server|rate-limit)$/},args=>({path:args.path,namespace:'fixture'}));
 plugin.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',resolveDir:root,contents:args.path.endsWith('/db')?'export function getSQL(){return globalThis.__lowfPreviewSQL}':args.path.endsWith('/rate-limit')?'export async function rateLimit(){globalThis.__lowfPreviewCommerce.rateCalls++}':`import {HttpError} from '${path.join(root,'lib/api.ts').replaceAll('\\','/')}';export async function requireAdmin(){const s=globalThis.__lowfPreviewCommerce;s.authCalls++;if(!s.user)throw new HttpError(401,'Sign in');if(!s.user.isAdmin||!s.user.emailVerified)throw new HttpError(403,'Owner required');return s.user;}`}));
}}]});
const {getAdminPaymentSettings,getCommerceStatus,encryptPaymentSecret,createCheckout,createSandboxTest,testRoute}=createRequire(import.meta.url)(path.join(temporary,'bundle.cjs'));
const owner={id:'fixture-owner',name:'Fixture owner',email:'owner@example.com',emailVerified:true,isAdmin:true};
const request=()=>new Request('https://preview.example.com/api/admin/payments/test',{method:'POST',headers:{Origin:'https://preview.example.com','Content-Type':'application/json'},body:JSON.stringify({idempotencyKey:randomUUID()})});
const cart={items:[{kind:'book',id:'sample',quantity:1}],idempotencyKey:randomUUID()};
function configured(mode='sandbox'){return{version:randomUUID(),mode,tmn_code:'LOWFTEST',secret_cipher:encryptPaymentSecret('fixture-merchant-secret-for-unit-tests'),shipping_fee_vnd:15500};}
function pendingSandboxOrder(){return{id:randomUUID(),user_id:owner.id,reference:'LFTEST123',mode:'sandbox',config_version:state.config.version,status:'pending',items:[],shipping:null,customer:{name:owner.name,email:owner.email},subtotal_vnd:10000,shipping_fee_vnd:0,total_vnd:10000,idempotency_key:randomUUID(),request_fingerprint:'',fulfillment_status:'unfulfilled',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+600000).toISOString(),paid_at:null,gateway_transaction_no:null};}
beforeEach(()=>{process.env.VERCEL_ENV='preview';state.user=owner;state.reads=[];state.authCalls=0;state.rateCalls=0;state.config=configured();state.order=null;});
after(async()=>{if(originalEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=originalEnv;if(originalSecret===undefined)delete process.env.NEON_AUTH_COOKIE_SECRET;else process.env.NEON_AUTH_COOKIE_SECRET=originalSecret;delete globalThis.__lowfPreviewCommerce;delete globalThis.__lowfPreviewSQL;await rm(temporary,{recursive:true,force:true});});

test('Preview reports checkout and Sandbox unavailable even with complete credentials',async()=>{
 const publicStatus=await getCommerceStatus(),ownerStatus=await getCommerceStatus(true),admin=await getAdminPaymentSettings();
 assert.equal(publicStatus.enabled,false);assert.equal(ownerStatus.sandboxReady,false);assert.equal(admin.config.sandboxReady,false);assert.equal(admin.config.hasSecret,true);
 assert.match(publicStatus.reason,/Preview/);assert.equal(publicStatus.reason,admin.preview.reason);assert.equal(admin.preview.productionSetupUrl,'https://lowf-library.vercel.app/admin?tab=payments');
 assert.equal(JSON.stringify(admin).includes(state.config.secret_cipher),false);
});
test('Preview cannot emit a checkout URL through either order entry point, even for retry keys',async()=>{
 state.order=pendingSandboxOrder();
 for(const operation of [()=>createCheckout(owner,cart,request()),()=>createSandboxTest(owner,randomUUID(),request())])await assert.rejects(operation(),error=>error.status===409&&error.code==='PAYMENTS_DISABLED_IN_PREVIEW');
 assert.deepEqual(state.reads,[],'guard precedes idempotency lookup and order insertion');
});
test('Preview Sandbox HTTP endpoint authenticates the owner before revealing environment state',async()=>{
 state.user=null;let response=await testRoute(request());assert.equal(response.status,401);
 state.user={...owner,isAdmin:false};response=await testRoute(request());assert.equal(response.status,403);
 state.user={...owner,emailVerified:false};response=await testRoute(request());assert.equal(response.status,403);
 state.user=owner;response=await testRoute(request());assert.equal(response.status,409);assert.equal((await response.json()).code,'PAYMENTS_DISABLED_IN_PREVIEW');
 assert.equal(state.authCalls,4);assert.equal(state.rateCalls,0);assert.deepEqual(state.reads,[]);
});
test('Cross-origin Preview requests fail before authentication',async()=>{
 const req=request();req.headers.set('Origin','https://foreign.invalid');const response=await testRoute(req);assert.equal(response.status,403);assert.equal(state.authCalls,0);assert.deepEqual(state.reads,[]);
});
test('Unverified users and non-owner Sandbox callers keep their authorization rejection',async()=>{
 await assert.rejects(createCheckout({...owner,emailVerified:false},cart,request()),error=>error.status===403&&error.code==='EMAIL_VERIFICATION_REQUIRED');
 await assert.rejects(createSandboxTest({...owner,isAdmin:false},randomUUID(),request()),error=>error.status===403);
 assert.deepEqual(state.reads,[]);
});
test('Production and development preserve Sandbox readiness and only production opens live checkout',async()=>{
 for(const environment of ['production','development']){process.env.VERCEL_ENV=environment;state.config=configured('sandbox');const admin=await getAdminPaymentSettings();assert.equal(admin.config.sandboxReady,true);assert.equal(admin.preview,undefined);assert.equal((await getCommerceStatus(true)).sandboxReady,true);state.config=configured('production');assert.equal((await getCommerceStatus()).enabled,environment==='production');assert.equal((await getAdminPaymentSettings()).config.enabled,environment==='production');}
});
test('A production owner still receives an official Sandbox URL for an existing test order',async()=>{
 process.env.VERCEL_ENV='production';state.order=pendingSandboxOrder();
 // Existing-order fingerprint is computed by the actual production function.
 const {createHash}=await import('node:crypto');state.order.request_fingerprint=createHash('sha256').update(JSON.stringify({purpose:'sandbox-test',amountVnd:10000})).digest('hex');
 const result=await createSandboxTest(owner,randomUUID(),request());assert.equal(new URL(result.paymentUrl).origin,'https://sandbox.vnpayment.vn');assert.equal(new URL(result.paymentUrl).searchParams.get('vnp_Amount'),'1000000');assert.equal(result.order.totalVnd,10000);assert.equal(state.reads.filter(query=>query.startsWith('INSERT')).length,0);
});
