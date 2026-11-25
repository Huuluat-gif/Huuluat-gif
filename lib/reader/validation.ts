import { z } from 'zod';

export const readerBookIdSchema = z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/);
export const readerLanguageSchema = z.enum(['en','vi','fr','de','es','it','pt','ja','ko','zh','ru']);
const pointSchema = z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).strict();
const strokeSchema = z.object({points:z.array(pointSchema).min(1).max(500),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#347353'),width:z.number().min(1).max(20).default(2)}).strict();
const anchorSchema = z.object({start:z.number().int().min(0).max(100000000),end:z.number().int().min(0).max(100000000)}).strict().refine(a=>a.end>=a.start,{message:'Vị trí cuối phải nằm sau vị trí đầu.'});
export const annotationSchema = z.object({
 id:z.uuid().optional(),bookId:readerBookIdSchema,chapter:z.number().int().min(0).max(9999).default(0),page:z.number().int().min(1).max(100000).default(1),
 quote:z.string().max(3000).default(''),note:z.string().max(4000).default(''),color:z.enum(['yellow','green','pink','blue']).default('yellow'),anchor:anchorSchema.optional(),
 strokes:z.array(strokeSchema).max(30).default([])
}).strict().refine(a=>!!(a.quote.trim()||a.note.trim()||a.strokes.length),{message:'Hãy chọn đoạn văn, nhập ghi chú hoặc thêm nét bút.'}).refine(a=>a.strokes.reduce((sum,s)=>sum+s.points.length,0)<=4000,{message:'Nét bút quá dài. Hãy lưu thành nhiều ghi chú.'});
export type AnnotationInput=z.infer<typeof annotationSchema>;
export const vocabularySchema = z.object({
 word:z.string().trim().min(1).max(200),translation:z.string().trim().min(1).max(2000),ipa:z.string().trim().max(160).default(''),
 sourceLang:readerLanguageSchema.default('en'),targetLang:readerLanguageSchema.default('vi'),bookId:readerBookIdSchema.optional()
}).strict();
export type VocabularyInput=z.infer<typeof vocabularySchema>;
export function normalizeVocabularyWord(word:string){return word.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('und');}
