import { z } from 'zod';
import { isHttpsIngress } from './env';
export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_ERROR') { super(message); }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function route<C = unknown>(handler: (request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C) => {
    try { return await handler(request, context); }
    catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
      if (error instanceof z.ZodError) return json({ error: 'Thông tin chưa hợp lệ.', code: 'VALIDATION_ERROR', issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, 400);
      // Do not log connection strings, auth cookies or upstream responses.
      const dbCode=error&&typeof error==='object'&&'code' in error?String(error.code):'';
      console.error('[Lowf API] request failed', { path: new URL(request.url).pathname, type: error instanceof Error ? error.name : 'UnknownError',code:/^[0-9A-Z]{5}$/.test(dbCode)?dbCode:undefined });
      return json({ error: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.', code: 'SERVICE_UNAVAILABLE' }, 503);
    }
  };
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  // Next's development server may set request.url to its 0.0.0.0 bind address.
  // Host is the HTTP authority the browser actually visited; browser scripts
  // cannot override it. Never accept an arbitrary x-forwarded-host here.
  const host=request.headers.get('host')||url.host;
  const forwardedProto=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const protocol=forwardedProto==='https'?'https:':isHttpsIngress()?'https:':url.protocol;
  let matches=false;
  try { const from=new URL(origin||'');matches=from.host===host&&from.protocol===protocol&&from.origin===origin; } catch {}
  if (!matches || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Yêu cầu phải được gửi từ chính website Lowf.', 'ORIGIN_REJECTED');
}
export async function parseBody<T extends z.ZodType>(request: Request, schema: T, maxBytes = 256 * 1024): Promise<z.infer<T>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Yêu cầu dữ liệu JSON.');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new HttpError(413, 'Dữ liệu quá lớn.');
  if (!request.body) throw new HttpError(400, 'Thiếu dữ liệu.');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) { const result = await reader.read(); if (result.done) break; bytes += result.value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Dữ liệu quá lớn.'); } chunks.push(result.value); }
  const merged = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown; try { body = JSON.parse(new TextDecoder().decode(merged)); } catch { throw new HttpError(400, 'JSON chưa hợp lệ.'); }
  return schema.parse(body);
}
export function dayKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
export function initials(name: string) { return name.trim().split(/\s+/u).slice(-2).map(s => s[0]).join('').toUpperCase(); }
