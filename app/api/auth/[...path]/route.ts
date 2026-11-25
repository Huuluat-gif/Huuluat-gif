import { getAuth } from '@/lib/auth/server';
import { assertSameOrigin, json, HttpError } from '@/lib/api';
type Context = { params: Promise<{ path: string[] }> };
export const dynamic = 'force-dynamic';
async function handle(request: Request, context: Context) {
  try {
    if (!['GET','HEAD'].includes(request.method)) assertSameOrigin(request);
    const handler = getAuth().handler();
    const method = request.method as keyof typeof handler;
    return await handler[method](request, context);
  } catch (error) {
    if(error instanceof HttpError)return json({error:error.message,code:error.code},error.status);
    return json({ error: 'Không thể xử lý yêu cầu đăng nhập. Hãy thử lại.', code: 'AUTH_REQUEST_FAILED' }, 503);
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
