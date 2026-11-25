import { getSQL } from '@/lib/db';
export async function hasMembership(userId: string): Promise<boolean> {
  const sql = getSQL(); const rows = await sql`SELECT 1 FROM lowf_memberships WHERE user_id=${userId} AND status='active' AND access='member' AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`; return rows.length>0;
}
export async function getMembership(userId: string) {
  const sql = getSQL(); const rows = await sql`SELECT plan_id,status,access,expires_at FROM lowf_memberships WHERE user_id=${userId} LIMIT 1`;
  const m=rows[0]; return m?{planId:m.plan_id,status:m.status,access:m.access,premium:m.access==='member'&&m.status==='active'&&(!m.expires_at||new Date(m.expires_at)>new Date()),expiresAt:m.expires_at}:null;
}
