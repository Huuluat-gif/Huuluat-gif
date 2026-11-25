import { z } from 'zod';
import { requireUser } from '@/lib/auth/server';
import { assertSameOrigin,json,route } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { deleteAnnotation } from '@/lib/reader/repository';
export const DELETE=route(async(request,context:{params:Promise<{id:string}>})=>{
 assertSameOrigin(request);const user=await requireUser();await rateLimit(`annotations-write:${user.id}`,60,60);
 return json(await deleteAnnotation(user.id,z.uuid().parse((await context.params).id)));
});
