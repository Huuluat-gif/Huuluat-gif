import { randomUUID } from 'node:crypto';
import { getSQL } from '@/lib/db';
import { HttpError } from '@/lib/api';
import { annotationSchema,vocabularySchema,normalizeVocabularyWord,type AnnotationInput,type VocabularyInput } from './validation';

type SQL=ReturnType<typeof getSQL>;
type Row=Record<string,unknown>;
export type AnnotationRecord=Omit<AnnotationInput,'id'> & {id:string;createdAt:string;updatedAt:string};
const dateString=(value:unknown)=>value instanceof Date?value.toISOString():String(value);
function annotation(row:Row):AnnotationRecord{return{...(row.data as Omit<AnnotationInput,'id'|'bookId'|'chapter'|'page'>),id:String(row.id),bookId:String(row.book_id),chapter:Number(row.chapter),page:Number(row.page),createdAt:dateString(row.created_at),updatedAt:dateString(row.updated_at)};}
function vocabulary(row:Row){return{id:row.id,word:row.word,translation:row.translation,ipa:row.ipa,sourceLang:row.source_lang,targetLang:row.target_lang,bookId:row.book_id||null,createdAt:row.created_at,updatedAt:row.updated_at};}

export async function listAnnotations(userId:string,bookId:string,offset=0,sql:SQL=getSQL()){
 // Drawings can be much larger than text notes. Bound response bytes as well
 // as row count so a heavily annotated PDF never creates a huge API response.
 const rows=await sql`WITH candidates AS (
  SELECT id,book_id,chapter,page,data,created_at,updated_at FROM lowf_reader_annotations
  WHERE user_id=${userId} AND book_id=${bookId} ORDER BY updated_at DESC,id LIMIT 501 OFFSET ${offset}
 ), budget AS (
  SELECT *,COUNT(*) OVER() AS available_count,ROW_NUMBER() OVER(ORDER BY updated_at DESC,id) AS position,
   SUM(octet_length(data::text)+700) OVER(ORDER BY updated_at DESC,id) AS response_bytes FROM candidates
 ) SELECT id,book_id,chapter,page,data,created_at,updated_at,available_count FROM budget WHERE response_bytes<=800000 OR position=1 ORDER BY updated_at DESC,id`;
 const annotations=rows.slice(0,500).map(annotation),available=Number(rows[0]?.available_count||0);
 return{annotations,hasMore:available>annotations.length,offset,nextOffset:offset+annotations.length};
}
export async function saveAnnotation(userId:string,input:AnnotationInput,sql:SQL=getSQL()){
 const parsed=annotationSchema.parse(input),{id= randomUUID(),bookId,chapter,page,...data}=parsed;
 const rows=await sql`INSERT INTO lowf_reader_annotations(id,user_id,book_id,chapter,page,data) VALUES(${id}::uuid,${userId},${bookId},${chapter},${page},${JSON.stringify(data)}::jsonb)
 ON CONFLICT(id) DO UPDATE SET chapter=EXCLUDED.chapter,page=EXCLUDED.page,data=EXCLUDED.data,updated_at=now()
 WHERE lowf_reader_annotations.user_id=EXCLUDED.user_id AND lowf_reader_annotations.book_id=EXCLUDED.book_id
 RETURNING id,book_id,chapter,page,data,created_at,updated_at`;
 if(!rows[0])throw new HttpError(404,'Không tìm thấy ghi chú của bạn trong cuốn sách này.');
 return annotation(rows[0]);
}
export async function deleteAnnotation(userId:string,id:string,sql:SQL=getSQL()){
 const rows=await sql`DELETE FROM lowf_reader_annotations WHERE id=${id}::uuid AND user_id=${userId} RETURNING id`;
 if(!rows[0])throw new HttpError(404,'Không tìm thấy ghi chú của bạn.');
 return{deleted:true,id};
}
export async function listVocabulary(userId:string,bookId?:string,offset=0,sql:SQL=getSQL()){
 const rows=bookId?await sql`SELECT id,word,translation,ipa,source_lang,target_lang,book_id,created_at,updated_at FROM lowf_reader_vocabulary WHERE user_id=${userId} AND book_id=${bookId} ORDER BY updated_at DESC,id LIMIT 501 OFFSET ${offset}`:await sql`SELECT id,word,translation,ipa,source_lang,target_lang,book_id,created_at,updated_at FROM lowf_reader_vocabulary WHERE user_id=${userId} ORDER BY updated_at DESC,id LIMIT 501 OFFSET ${offset}`;
 return{words:rows.slice(0,500).map(vocabulary),hasMore:rows.length>500,offset};
}
export async function saveVocabulary(userId:string,input:VocabularyInput,sql:SQL=getSQL()){
 const body=vocabularySchema.parse(input),id=randomUUID(),normalized=normalizeVocabularyWord(body.word);
 const rows=await sql`INSERT INTO lowf_reader_vocabulary(id,user_id,word,normalized_word,translation,ipa,source_lang,target_lang,book_id) VALUES(${id}::uuid,${userId},${body.word},${normalized},${body.translation},${body.ipa},${body.sourceLang},${body.targetLang},${body.bookId||null})
 ON CONFLICT(user_id,normalized_word,source_lang,target_lang) DO UPDATE SET word=EXCLUDED.word,translation=EXCLUDED.translation,ipa=EXCLUDED.ipa,book_id=COALESCE(EXCLUDED.book_id,lowf_reader_vocabulary.book_id),updated_at=now()
 RETURNING id,word,translation,ipa,source_lang,target_lang,book_id,created_at,updated_at`;
 return vocabulary(rows[0]);
}
export async function deleteVocabulary(userId:string,id:string,sql:SQL=getSQL()){
 const rows=await sql`DELETE FROM lowf_reader_vocabulary WHERE id=${id}::uuid AND user_id=${userId} RETURNING id`;
 if(!rows[0])throw new HttpError(404,'Không tìm thấy từ vựng của bạn.');
 return{deleted:true,id};
}
