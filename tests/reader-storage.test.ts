import assert from 'node:assert/strict';
import { after,before,beforeEach,test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { readerSchemaStatements } from '../lib/reader/schema';
import { annotationSchema,vocabularySchema } from '../lib/reader/validation';
import { listAnnotations,saveAnnotation,deleteAnnotation,listVocabulary,saveVocabulary,deleteVocabulary } from '../lib/reader/repository';
import type { getSQL } from '../lib/db';

// Actual PostgreSQL queries, with a private in-memory WASM database. No live
// credentials, network calls or changes to the site's database are used.
const db=new PGlite();
const sql=(async(strings:TemplateStringsArray,...values:unknown[])=>{
 const query=strings.reduce((text,part,index)=>text+(index?`$${index}`:'')+part,'');
 return(await db.query(query,values)).rows;
}) as ReturnType<typeof getSQL>;
before(async()=>{await db.waitReady;for(const statement of readerSchemaStatements)await db.exec(statement);});
beforeEach(async()=>{await db.exec('TRUNCATE lowf_reader_annotations,lowf_reader_vocabulary');});
after(async()=>{await db.close();});
const note=(overrides:Record<string,unknown>={})=>annotationSchema.parse({bookId:'gutenberg:1342',quote:'It is a truth universally acknowledged.',note:'Lời mở đầu',anchor:{start:0,end:37},...overrides});

test('annotations persist text, chapter anchors and normalized pen coordinates',async()=>{
 const strokes=[{points:[{x:0,y:0},{x:0.5,y:1}],color:'#347353',width:3}];
 const saved=await saveAnnotation('reader-A',note({chapter:2,page:7,strokes}),sql);
 const result=await listAnnotations('reader-A','gutenberg:1342',0,sql);
 assert.equal(result.annotations.length,1);assert.equal(result.annotations[0].id,saved.id);assert.equal(result.annotations[0].chapter,2);assert.equal(result.annotations[0].page,7);
 assert.deepEqual(result.annotations[0].strokes,strokes);assert.deepEqual(result.annotations[0].anchor,{start:0,end:37});
 assert.equal('user_id' in result.annotations[0],false);
});
test('another reader cannot list, replace or delete annotations by guessed identifier',async()=>{
 const saved=await saveAnnotation('reader-A',note(),sql),id=String(saved.id);
 assert.deepEqual((await listAnnotations('reader-B','gutenberg:1342',0,sql)).annotations,[]);
 await assert.rejects(()=>saveAnnotation('reader-B',note({id,note:'Other user attempt'}),sql),e=>(e as {status?:number}).status===404);
 await assert.rejects(()=>deleteAnnotation('reader-B',id,sql),e=>(e as {status?:number}).status===404);
 assert.equal((await listAnnotations('reader-A','gutenberg:1342',0,sql)).annotations[0].note,'Lời mở đầu');
});
test('annotation updates retain identity and cannot move the identifier to another book',async()=>{
 const first=await saveAnnotation('reader-A',note(),sql),id=String(first.id);
 const updated=await saveAnnotation('reader-A',note({id,note:'Ghi chú mới',chapter:3}),sql);
 assert.equal(updated.id,id);assert.equal(updated.note,'Ghi chú mới');
 await assert.rejects(()=>saveAnnotation('reader-A',note({id,bookId:'local:other-pdf'}),sql),e=>(e as {status?:number}).status===404);
 assert.equal((await listAnnotations('reader-A','gutenberg:1342',0,sql)).annotations.length,1);
 assert.equal((await listAnnotations('reader-A','local:other-pdf',0,sql)).annotations.length,0);
 await deleteAnnotation('reader-A',id,sql);assert.equal((await listAnnotations('reader-A','gutenberg:1342',0,sql)).annotations.length,0);
});
test('vocabulary deduplicates normalized terms per user and language pair',async()=>{
 const first=await saveVocabulary('reader-A',vocabularySchema.parse({word:' Garden ',translation:'khu vườn',ipa:'/ˈɡɑːdən/',bookId:'garden'}),sql);
 const again=await saveVocabulary('reader-A',vocabularySchema.parse({word:'garden',translation:'vườn',ipa:'/ˈɡɑːdən/'}),sql);
 assert.equal(first.id,again.id);assert.equal(again.bookId,'garden');assert.equal(again.translation,'vườn');
 await saveVocabulary('reader-A',vocabularySchema.parse({word:'garden',translation:'jardin',targetLang:'fr'}),sql);
 const other=await saveVocabulary('reader-B',vocabularySchema.parse({word:'garden',translation:'vườn'}),sql);
 assert.notEqual(other.id,first.id);assert.equal((await listVocabulary('reader-A',undefined,0,sql)).words.length,2);assert.equal((await listVocabulary('reader-B',undefined,0,sql)).words.length,1);
 await assert.rejects(()=>deleteVocabulary('reader-B',String(first.id),sql),e=>(e as {status?:number}).status===404);
 await deleteVocabulary('reader-A',String(first.id),sql);assert.equal((await listVocabulary('reader-A',undefined,0,sql)).words.length,1);
});
test('input rejects owner injection, invalid anchors and oversized drawings',()=>{
 assert.throws(()=>note({user_id:'other'}));assert.throws(()=>note({anchor:{start:30,end:2}}));
 assert.throws(()=>note({strokes:[{points:[{x:2,y:0}]}]}));
 assert.throws(()=>note({strokes:Array.from({length:9},()=>({points:Array.from({length:500},()=>({x:0.2,y:0.5}))}))}));
 assert.throws(()=>note({quote:'',note:'',strokes:[]}));
 assert.doesNotThrow(()=>annotationSchema.parse({bookId:'local:1234',quote:'',note:'PDF note'}));
});
test('idempotent schema initialization keeps existing reader data',async()=>{
 await saveAnnotation('reader-A',note(),sql);
 for(const statement of readerSchemaStatements)await db.exec(statement);
 assert.equal((await listAnnotations('reader-A','gutenberg:1342',0,sql)).annotations.length,1);
});
test('large pen notes paginate by response size without losing records',async()=>{
 const strokes=Array.from({length:8},()=>({points:Array.from({length:500},()=>({x:0.123456,y:0.765432})),color:'#347353',width:2}));
 for(let i=0;i<9;i++)await saveAnnotation('reader-A',note({note:`Drawing ${i}`,strokes}),sql);
 const first=await listAnnotations('reader-A','gutenberg:1342',0,sql);
 assert.equal(first.hasMore,true);assert.ok(Buffer.byteLength(JSON.stringify(first))<850000);
 const next=await listAnnotations('reader-A','gutenberg:1342',first.nextOffset,sql);
 assert.equal(first.annotations.length+next.annotations.length,9);assert.equal(next.hasMore,false);
 assert.equal(new Set([...first.annotations,...next.annotations].map(item=>item.id)).size,9);
});
