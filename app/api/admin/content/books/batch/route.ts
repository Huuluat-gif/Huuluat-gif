import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSQL } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/server';
import { route, json, assertSameOrigin, parseBody, HttpError } from '@/lib/api';
import { normalizeItem, validateAssets, adminItem } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const batchSchema = z.object({
  books: z.array(z.record(z.string(), z.unknown())).min(1).max(30),
});

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const user = await requireAdmin();
  await rateLimit(`admin-batch:${user.id}`, 600, 60);

  const body = await parseBody(request, batchSchema, 4 * 1024 * 1024);
  const sql = getSQL();
  const saved: Record<string, unknown>[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const raw of body.books) {
    const candidateId = typeof raw.id === 'string' ? raw.id : '';
    try {
      const cleanRaw = { ...raw };
      if (!cleanRaw.id) delete cleanRaw.id;
      const item = normalizeItem('books', cleanRaw);
      const id = String(item.id || randomUUID());
      item.id = id;
      await validateAssets('books', item, user.id);
      await sql`
        INSERT INTO lowf_content(kind, id, data, status)
        VALUES('books', ${id}, ${JSON.stringify(item)}::jsonb, ${String(item.status)})
        ON CONFLICT(kind, id) DO UPDATE
          SET data = EXCLUDED.data,
              status = EXCLUDED.status,
              updated_at = now()
      `;
      saved.push(adminItem(item));
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : 'Không thể lưu sách.';
      failed.push({ id: candidateId || '(no-id)', error: message });
    }
  }

  return json({ saved, failed }, saved.length ? 200 : 400);
});
