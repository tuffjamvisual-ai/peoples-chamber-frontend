'use client';

// The signed in member's part of /preferences (job 74). Everything comes from /api/preferences, which only ever
// returns the member's own rows.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

type Prefs = {
  settings: { frequency: 'weekly' | 'off'; consentedAt: string } | null;
  follows: { kind: 'mp' | 'bill' | 'donor'; key: string; label: string; href: string; since: string }[];
  searches: { id: number; label: string; query: string; filters: Record<string, string>; alert: boolean }[];
  newsletter: boolean;
  emailVerified: boolean;
  limits: { follows: number; searches: number };
};

const KIND_LABEL = { mp: 'MP', bill: 'Bill', donor: 'Donor' } as const;
const h2: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', margin: '0 0 12px' };
const p: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 10px', maxWidth: '640px' };
const btn: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', color: ACCENT, background: 'transparent', border: `1.5px solid ${ACCENT}`, borderRadius: '3px', padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap' };
const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px 12px', borderBottom: `1px solid ${HAIRLINE}`, padding: '10px 0' };

function searchHref(s: Prefs['searches'][number]) {
  const q = new URLSearchParams({ q: s.query });
  for (const [k, v] of Object.entries(s.filters || {})) if (v) q.set(k, String(v));
  return `/search?${q}`;
}

export default function MemberPreferences() {
  const { user, authLoading } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    fetch('/api/preferences', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Prefs) => { setPrefs(d); setError(null); })
      .catch(() => setError('Your preferences could not be loaded. Please try again.'));
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  async function send(method: string, url: string, body?: unknown) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) setError('That did not work. Please try again.');
    load();
  }

  if (authLoading) return <p style={p}>Loading…</p>;
  if (!user) {
    return (
      <div style={p}>
        <p style={p}>Sign in to see what you follow, your saved searches and your weekly email.</p>
        <Link href="/login?returnTo=%2Fpreferences" style={{ color: ACCENT }}>Log in or create an account</Link>
      </div>
    );
  }
  if (!prefs) return <p style={p}>{error ?? 'Loading…'}</p>;

  return (
    <div>
      {error && <p role="status" style={{ ...p, color: ACCENT }}>{error}</p>}

      <section style={{ marginBottom: '32px' }}>
        <h2 style={h2}>Weekly email</h2>
        {!prefs.settings ? (
          <p style={p}>You do not follow anything yet. Use the Follow button on an MP, bill or donor page, or save a search, and we send one email a week when something changes.</p>
        ) : (
          <>
            <p style={p}>
              {prefs.settings.frequency === 'weekly'
                ? 'On: one email a week at most, only when something you follow changed.'
                : 'Off: you get no emails about what you follow.'}
              {!prefs.emailVerified && ' Confirm your email address to get it.'}
            </p>
            <button type="button" style={btn} onClick={() => send('POST', '/api/preferences', { frequency: prefs.settings!.frequency === 'weekly' ? 'off' : 'weekly' })}>
              {prefs.settings.frequency === 'weekly' ? 'Turn the weekly email off' : 'Turn the weekly email on'}
            </button>
          </>
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={h2}>What you follow ({prefs.follows.length} of {prefs.limits.follows})</h2>
        {prefs.follows.length === 0 && <p style={p}>Nothing yet.</p>}
        {prefs.follows.map((f) => (
          <div key={`${f.kind}:${f.key}`} style={row}>
            <span style={{ fontSize: '16px', minWidth: 0, overflowWrap: 'anywhere' }}>
              <span style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, marginRight: '8px' }}>{KIND_LABEL[f.kind]}</span>
              <Link href={f.href} style={{ color: INK }}>{f.label}</Link>
            </span>
            <button type="button" style={btn} onClick={() => send('DELETE', '/api/follows', { kind: f.kind, key: f.key })}>Unfollow</button>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={h2}>Saved searches ({prefs.searches.length} of {prefs.limits.searches})</h2>
        {prefs.searches.length === 0 && <p style={p}>None yet. Save a search from the search page.</p>}
        {prefs.searches.map((s) => (
          <div key={s.id} style={row}>
            <Link href={searchHref(s)} style={{ color: INK, fontSize: '16px', minWidth: 0, overflowWrap: 'anywhere' }}>{s.label}</Link>
            <span style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontFamily: MONO, fontSize: '15px', display: 'inline-flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={s.alert} onChange={(e) => send('PATCH', '/api/saved-searches', { id: s.id, alert: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                New results in my weekly email
              </label>
              <button type="button" style={btn} onClick={() => send('DELETE', '/api/saved-searches', { id: s.id })}>Delete</button>
            </span>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={h2}>Open Govt Weekly newsletter</h2>
        <label style={{ ...p, display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={prefs.newsletter} onChange={(e) => send('POST', '/api/preferences', { newsletter: e.target.checked })} style={{ width: '16px', height: '16px' }} />
          Send me the weekly newsletter
        </label>
      </section>

      {(prefs.settings || prefs.follows.length > 0 || prefs.searches.length > 0) && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={h2}>Delete everything I follow</h2>
          <p style={p}>Removes every follow, every saved search and your agreement to keep them. Your account stays.</p>
          {!confirmDelete ? (
            <button type="button" style={btn} onClick={() => setConfirmDelete(true)}>Delete everything I follow</button>
          ) : (
            <span style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" style={{ ...btn, color: '#fff', background: ACCENT }} onClick={() => { setConfirmDelete(false); send('DELETE', '/api/preferences'); }}>Yes, delete it all</button>
              <button type="button" style={btn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          )}
        </section>
      )}
    </div>
  );
}
