import assert from 'node:assert/strict';
import { randomBytes,randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
const require=createRequire(import.meta.url),{request}=require('playwright');
dotenv.config({path:'.env.local',quiet:true});
const base=process.env.BASE_URL||'http://localhost:3100',origin=new URL(base).origin;
const email=`lowf-qa-${randomUUID()}@example.com`,password=randomBytes(24).toString('base64url');
const proxy=new URL(base).hostname.endsWith('.vercel.app')&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
const sql=neon(process.env.DATABASE_URL),client=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:origin},proxy});
let userId;
try{
 const signup=await client.post('/api/auth/sign-up/email',{data:{name:'Lowf QA temporary',email,password,callbackURL:origin+'/'}});
 console.log('Signup HTTP',signup.status());
 const signupBody=await signup.json();
 if(signup.status()!==200)console.log('Signup error',signupBody.message||signupBody.code||signupBody.error);
 assert.equal(signup.status(),200);
 const signIn=await client.post('/api/auth/sign-in/email',{data:{email,password,callbackURL:origin+'/'}});
 console.log('Sign-in HTTP',signIn.status());
 if(signIn.status()!==200){const error=await signIn.json();console.log('Sign-in reason',error.code||error.message);assert.equal(error.code,'EMAIL_NOT_VERIFIED');console.log('PASS verification required; owner registration must verify email first.');}
 else {
  const sessionResponse=await client.get('/api/auth/get-session');const sessionBody=await sessionResponse.json();console.log('Session proxy HTTP',sessionResponse.status(),'has user',!!sessionBody?.user,'code',sessionBody?.code||'none');
  const meResponse=await client.get('/api/me');const me=await meResponse.json();console.log('Profile HTTP',meResponse.status(),me.error||'OK');assert.equal(meResponse.status(),200);assert.equal(me.user.email,email);userId=me.user.id;assert.equal(me.user.isAdmin,false);console.log('PASS real email/password session with no admin privilege');
  assert.equal((await client.get('/api/admin/content/books')).status(),403);console.log('PASS regular account cannot manage content');
  const free=await client.post('/api/membership',{data:{planId:'free'}});assert.equal(free.status(),200);assert.equal((await free.json()).membership.access,'free');console.log('PASS free membership persisted');
  const paid=await client.post('/api/membership',{data:{planId:'plus'}});assert.equal(paid.status(),503);assert.equal((await paid.json()).code,'PAYMENTS_NOT_CONNECTED');console.log('PASS paid plan cannot grant unpaid access');
  const catalog=await(await client.get('/api/bootstrap')).json(),bookId=catalog.books[0].id;
  const save=await client.post('/api/user-data',{data:{saved:[bookId],progress:{[bookId]:{chapter:1}}}});assert.equal(save.status(),200);
  const again=await(await client.get('/api/me')).json();assert.deepEqual(again.data.saved,[bookId]);assert.equal(again.data.progress[bookId].chapter,1);console.log('PASS saved books and reading progress persist');
  const tick=await client.post('/api/reading',{data:{active:true,source:'reader',bookId,sessionId:randomUUID()}});assert.equal(tick.status(),200);assert.equal((await tick.json()).addedSeconds,0);console.log('PASS new reading session cannot claim arbitrary minutes');
  const annotation=await client.post('/api/reader/annotations',{data:{bookId,chapter:0,page:1,quote:'A saved reader excerpt',note:'Temporary QA note',color:'green',anchor:{start:0,end:22}}});assert.equal(annotation.status(),200);const note=(await annotation.json()).annotation;
  const annotationList=await(await client.get('/api/reader/annotations?bookId='+encodeURIComponent(bookId))).json();assert.ok(annotationList.annotations.some(x=>x.id===note.id&&x.note==='Temporary QA note'));console.log('PASS reader highlight/note persists in real account');
  const drawing=await client.post('/api/reader/annotations',{data:{bookId,chapter:0,page:1,strokes:[{points:[{x:0.1,y:0.2},{x:0.4,y:0.5}],color:'#ffbb00',width:3}]}});assert.equal(drawing.status(),200);console.log('PASS normalized pen drawing persists');
  const vocabulary=await client.post('/api/reader/vocabulary',{data:{word:'book',translation:'sách',ipa:'/bʊk/',sourceLang:'en',targetLang:'vi',bookId}});assert.equal(vocabulary.status(),200);const word=(await vocabulary.json()).word;
  const wordList=await(await client.get('/api/reader/vocabulary')).json();assert.ok(wordList.words.some(x=>x.id===word.id&&x.ipa==='/bʊk/'));console.log('PASS translated vocabulary and IPA persist');
  assert.equal((await client.delete('/api/reader/vocabulary/'+word.id)).status(),200);assert.equal((await client.delete('/api/reader/annotations/'+note.id)).status(),200);console.log('PASS reader-owned note and vocabulary deletion');
  const signout=await client.post('/api/auth/sign-out',{data:{}});assert.equal(signout.status(),200);const loggedOut=await(await client.get('/api/me')).json();assert.equal(loggedOut.user,null);console.log('PASS sign-out clears real session');
 }
}finally{
 // This exact random reserved-domain account is created solely by this test.
 const users=await sql`SELECT id FROM neon_auth.user WHERE email=${email}`;
 for(const user of users){const id=user.id;await sql.transaction(tx=>[
  tx`DELETE FROM lowf_reader_annotations WHERE user_id=${id}`,tx`DELETE FROM lowf_reader_vocabulary WHERE user_id=${id}`,
  tx`DELETE FROM lowf_rate_limits WHERE key LIKE ${`%:${id}`}`,tx`DELETE FROM lowf_memberships WHERE user_id=${id}`,tx`DELETE FROM lowf_user_data WHERE user_id=${id}`,
  tx`DELETE FROM lowf_reading_clock WHERE user_id=${id}`,tx`DELETE FROM lowf_reading_days WHERE user_id=${id}`,
  tx`DELETE FROM lowf_profiles WHERE user_id=${id}`,tx`DELETE FROM lowf_rate_limits WHERE key IN (${`data:${id}`},${`reading:${id}`})`,
  tx`DELETE FROM neon_auth.session WHERE "userId"=${id}`,tx`DELETE FROM neon_auth.account WHERE "userId"=${id}`,
  tx`DELETE FROM neon_auth.user WHERE id=${id} AND email=${email}`
 ]);}
 await client.dispose();console.log('Temporary QA account cleaned up.');
}
