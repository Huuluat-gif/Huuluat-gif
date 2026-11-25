import { z } from 'zod';
import { requireUser } from '@/lib/auth/server';
import { assertSameOrigin,json,parseBody,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { readerBookIdSchema,vocabularySchema } from '@/lib/reader/validation';
import { listVocabulary,saveVocabulary } from '@/lib/reader/repository';
export const dynamic='force-dynamic';
export const GET=route(async request=>{
 const user=await requireUser();await rateLimit(`vocabulary-read:${user.id}`,120,60);
 const params=new URL(request.url).searchParams,bookId=params.has('bookId')?readerBookIdSchema.parse(params.get('bookId')):undefined,offset=z.coerce.number().int().min(0).max(100000).parse(params.get('offset')||0);
 return json(await listVocabulary(user.id,bookId,offset));
});
export const POST=route(async request=>{
 assertSameOrigin(request);const user=await requireUser();await rateLimit(`vocabulary-write:${user.id}`,45,60);
 return json({word:await saveVocabulary(user.id,await parseBody(request,vocabularySchema,16*1024))});
});
