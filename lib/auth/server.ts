import { createNeonAuth } from '@neon/auth/next/server';
import { HttpError } from '@/lib/api';
import { getSQL } from '@/lib/db';
export type User = { id: string; name: string; email: string; emailVerified: boolean; isAdmin: boolean };
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL, secret = process.env.VERCEL_ENV==='preview'?process.env.LOWF_PREVIEW_AUTH_COOKIE_SECRET:process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret || secret.length < 32) throw new Error('Authentication is not configured');
    instance = createNeonAuth({ baseUrl, cookies: { secret, sessionDataTtl: 60 }, logLevel: 'silent' });
  }
  return instance;
}
export async function getUser(): Promise<User | null> {
  const result = await getAuth().getSession();
  if (result.error) throw new HttpError(503, 'Chưa kết nối được dịch vụ đăng nhập.');
  const u = result.data?.user;
  if (!u) return null;
  const email = u.email.trim().toLowerCase(), owner = process.env.LOWF_OWNER_EMAIL?.trim().toLowerCase();
  return { id: u.id, name: u.name || 'Bạn đọc', email, emailVerified: u.emailVerified === true, isAdmin: !!owner && u.emailVerified === true && email === owner };
}
export async function requireUser(): Promise<User> {
  const user = await getUser(); if (!user) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.', 'AUTH_REQUIRED'); return user;
}
export async function requireAdmin(): Promise<User> {
  const user = await requireUser(); if (!user.isAdmin) throw new HttpError(403, 'Chỉ chủ website đã xác minh email được quản trị.', 'ADMIN_REQUIRED'); return user;
}
export async function syncProfile(user: User) {
  const sql = getSQL();
  await sql`INSERT INTO lowf_profiles (user_id, display_name) VALUES (${user.id},${user.name.slice(0,100)}) ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now()`;
}
