import { z } from 'zod';
import { requireUser } from '@/lib/auth/server';
import { assertSameOrigin,json,parseBody,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { annotationSchema,readerBookIdSchema } from '@/lib/reader/validation';
import { listAnnotations,saveAnnotation } from '@/lib/reader/repository';
export const dynamic='force-dynamic';
export const GET=route(async request=>{
 const user=await requireUser();await rateLimit(`annotations-read:${user.id}`,120,60);
 const params=new URL(request.url).searchParams,bookId=readerBookIdSchema.parse(params.get('bookId')),offset=z.coerce.number().int().min(0).max(100000).parse(params.get('offset')||0);
 return json(await listAnnotations(user.id,bookId,offset));
});
export const POST=route(async request=>{
 assertSameOrigin(request);const user=await requireUser();await rateLimit(`annotations-write:${user.id}`,60,60);
 const body=await parseBody(request,annotationSchema,256*1024);
 return json({annotation:await saveAnnotation(user.id,body)});
});
