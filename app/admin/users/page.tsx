import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const userId = verifySessionToken(token);
  if (!userId) return notFound();

  const { data: me } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();
  if (!me?.is_admin) return notFound();

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const [totalRes, activeRes, listRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('users')
      .select('id', { count: 'exact', head: true })
      .gte('last_seen_at', fifteenMinsAgo),
    supabaseAdmin.from('users')
      .select('id, username, email, created_at, last_seen_at')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(500),
  ]);

  const total = totalRes.count ?? 0;
  const active = activeRes.count ?? 0;
  const rows = (listRes.data ?? []).map(u => ({
    id: u.id as number,
    username: (u.username as string | null) ?? '—',
    domain: (u.email as string | null) ? '@' + (u.email as string).split('@')[1] : '—',
    created: (u.created_at as string | null) ? (u.created_at as string).slice(0, 10) : '—',
    lastSeen: (u.last_seen_at as string | null)
      ? (u.last_seen_at as string).slice(0, 16).replace('T', ' ') + ' UTC'
      : 'never',
  }));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>User activity</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Total: <strong>{total}</strong> &nbsp;|&nbsp; Active (last 15 min): <strong>{active}</strong>
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            {['ID', 'Username', 'Email domain', 'Created', 'Last seen'].map(h => (
              <th key={h} style={{ padding: '6px 12px', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '6px 12px', color: '#aaa' }}>{r.id}</td>
              <td style={{ padding: '6px 12px' }}>{r.username}</td>
              <td style={{ padding: '6px 12px', color: '#666' }}>{r.domain}</td>
              <td style={{ padding: '6px 12px', color: '#aaa' }}>{r.created}</td>
              <td style={{ padding: '6px 12px' }}>{r.lastSeen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
