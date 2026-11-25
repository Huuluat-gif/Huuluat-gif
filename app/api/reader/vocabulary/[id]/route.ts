import { z } from 'zod';
import { requireUser } from '@/lib/auth/server';
import { assertSameOrigin,json,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { deleteVocabulary } from '@/lib/reader/repository';
export const DELETE=route(async(request,context:{params:Promise<{id:string}>})=>{
 assertSameOrigin(request);const user=await requireUser();await rateLimit(`vocabulary-write:${user.id}`,45,60);
 return json(await deleteVocabulary(user.id,z.uuid().parse((await context.params).id)));
});
