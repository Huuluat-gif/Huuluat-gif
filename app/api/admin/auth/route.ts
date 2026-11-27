import { requireAdmin, ensureProfileAvatarColumn } from '@/lib/auth/server';
import { getSQL } from '@/lib/db';
import { json, route } from '@/lib/api';
import { getAppEnv, isIsolatedPreviewEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const admin = await requireAdmin();
  await ensureProfileAvatarColumn();
  const sql = getSQL();
  const baseUrl = process.env.NEON_AUTH_BASE_URL || '';
  const cookieSecret = isIsolatedPreviewEnv()
    ? process.env.LOWF_PREVIEW_AUTH_COOKIE_SECRET
    : process.env.NEON_AUTH_COOKIE_SECRET;
  const [countRows, recentRows] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total FROM lowf_profiles`,
    sql`SELECT user_id, display_name, avatar_url, updated_at FROM lowf_profiles ORDER BY updated_at DESC LIMIT 20`,
  ]);
  let authHost = '';
  try { authHost = baseUrl ? new URL(baseUrl).host : ''; } catch {}
  return json({
    status: {
      neonAuthConfigured: Boolean(baseUrl && cookieSecret && cookieSecret.length >= 32),
      authHost,
      ownerEmail: admin.email,
      sessionTtlSeconds: 300,
      environment: getAppEnv(),
      methods: ['Google OAuth 1 chạm', 'Mã Email 6 số (OTP)', 'Email + Mật khẩu'],
    },
    stats: {
      totalProfiles: Number(countRows[0]?.total || 0),
    },
    recentUsers: recentRows.map((r) => ({
      id: String(r.user_id),
      name: String(r.display_name || 'Bạn đọc'),
      avatarUrl: String(r.avatar_url || ''),
      updatedAt: r.updated_at ? new Date(String(r.updated_at)).toISOString() : '',
    })),
  });
});
