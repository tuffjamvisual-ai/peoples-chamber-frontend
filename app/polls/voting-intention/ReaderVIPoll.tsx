'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

const INK = '#14100d';
const ACCENT = '#6b2417';
const MONO = 'Special Elite, monospace';

type Party = { key: string; label: string; pollsterKey: string | null; colour: string };
const PARTIES: Party[] = [
  { key: 'reform', label: 'Reform UK', pollsterKey: 'reform', colour: '#12B6CF' },
  { key: 'labour', label: 'Labour', pollsterKey: 'labour', colour: '#E4003B' },
  { key: 'conservative', label: 'Conservative', pollsterKey: 'conservative', colour: '#0087DC' },
  { key: 'green', label: 'Green', pollsterKey: 'green', colour: '#6AB023' },
  { key: 'libdem', label: 'Lib Dem', pollsterKey: 'libdem', colour: '#FAA61A' },
  { key: 'snp', label: 'SNP', pollsterKey: 'snp', colour: '#BBab00' },
  { key: 'another', label: 'Another party', pollsterKey: null, colour: '#777' },
  { key: 'wouldnt', label: "Wouldn't vote", pollsterKey: null, colour: '#aaa' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

const LOGIN = `/login?mode=signup&returnTo=${encodeURIComponent('/polls/voting-intention')}`;

export default function ReaderVIPoll({ pollster, initialTally, initialTotal, initialSeeded }: {
  pollster: Record<string, number | undefined>;
  initialTally?: Record<string, number>;
  initialTotal?: number;
  initialSeeded?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [tally, setTally] = useState<Record<string, number>>(initialTally || {});
  const [total, setTotal] = useState(initialTotal || 0);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [userVoteText, setUserVoteText] = useState<string | null>(null);
  const [votedAt, setVotedAt] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(!!initialSeeded);
  const [selected, setSelected] = useState('');
  const [otherText, setOtherText] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(initialTally === undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identity is carried by the httpOnly session cookie; no userId is sent.
  function apply(d: { tally?: Record<string, number>; total?: number; userVote?: string | null; userVoteText?: string | null; votedAt?: string | null; seeded?: boolean }) {
    setTally(d.tally || {});
    setTotal(d.total || 0);
    setUserVote(d.userVote ?? null);
    setUserVoteText(d.userVoteText ?? null);
    setVotedAt(d.votedAt ?? null);
    setSeeded(!!d.seeded);
  }

  useEffect(() => {
    fetch('/api/reader-vi')
      .then((r) => r.json())
      .then((d) => { apply(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  async function submit() {
    setError(null);
    if (!user) { router.push(LOGIN); return; }
    if (!selected) { setError('Pick an option first.'); return; }
    if (selected === 'another' && !otherText.trim()) { setError('Name the party you would vote for.'); return; }
    setSubmitting(true);
    const res = await fetch('/api/reader-vi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ party: selected, otherText: selected === 'another' ? otherText.trim() : undefined }),
    });
    setSubmitting(false);
    if (res.status === 401) { router.push(LOGIN); return; }
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Could not record your vote.'); return; }
    apply(d);
    setEditing(false);
  }

  const pct = (k: string) => (total > 0 ? ((tally[k] || 0) / total) * 100 : 0);
  const maxReader = Math.max(1, ...PARTIES.map((p) => pct(p.key)));

  const box: React.CSSProperties = { marginBottom: '44px', padding: '20px 22px', border: '1px solid rgba(20,16,13,0.25)', borderTop: `3px solid ${ACCENT}`, background: 'rgba(107,36,23,0.03)' };
  const label: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.2em', color: ACCENT, marginBottom: '6px' };
  const p15: React.CSSProperties = { fontFamily: MONO, fontSize: '15px', color: INK };

  if (loading) return <section style={box}><p style={{ ...p15, margin: 0 }}>Loading…</p></section>;

  const voted = userVote !== null;
  const showForm = !voted || editing;
  const currentLabel = userVote
    ? userVote === 'another' && userVoteText
      ? userVoteText
      : PARTIES.find((p) => p.key === userVote)?.label ?? userVote
    : '';

  return (
    <section style={box} id="have-your-say">
      <p style={label}>Have your say</p>
      <h2 style={{ fontSize: 'clamp(19px, 2.6vw, 26px)', fontWeight: 'bold', color: INK, margin: '0 0 6px' }}>
        If a general election were held tomorrow, how would you vote?
      </h2>

      <p style={{ ...p15, margin: '0 0 2px' }}>
        {voted ? (
          <>You last voted <strong>{currentLabel}</strong>{votedAt ? ` on ${fmtDate(votedAt)}` : ''}. Here is how </>
        ) : (
          'How '
        )}
        {total.toLocaleString('en-GB')} opengovt {total === 1 ? 'reader has' : 'readers have'} voted, next to the pollsters&rsquo; average.
      </p>

      {/* Always-visible readers-vs-pollsters comparison */}
      <div style={{ margin: '12px 0 0' }}>
        {PARTIES.map((p) => {
          const rv = pct(p.key);
          const pv = p.pollsterKey ? pollster[p.pollsterKey] : undefined;
          return (
            <div key={p.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 108px', alignItems: 'center', gap: '10px', margin: '7px 0' }}>
              <span style={p15}>{p.label}</span>
              <span style={{ height: '11px', background: 'rgba(20,16,13,0.10)', position: 'relative', borderRadius: '1px' }}>
                <span aria-hidden style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(rv / maxReader) * 100}%`, background: p.colour, borderRadius: '1px' }} />
              </span>
              <span style={{ ...p15, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {rv.toFixed(1)}%{pv != null ? <span style={{ opacity: 0.75 }}> · polls {pv.toFixed(1)}%</span> : null}
              </span>
            </div>
          );
        })}
      </div>

      {seeded && (
        <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: ACCENT, margin: '14px 0 0' }}>
          These figures currently include the poll-of-polls average as a temporary launch baseline, and will move towards readers&rsquo; own choices as more people vote.
        </p>
      )}

      {/* Vote controls */}
      {showForm ? (
        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(20,16,13,0.15)' }}>
          <p style={{ ...p15, margin: '0 0 12px' }}>
            {voted ? 'Change your choice.' : 'Add your vote.'} One vote per account, and you can change it any time. {user ? '' : 'You will need to log in.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: '12px' }}>
            {PARTIES.map((p) => (
              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', ...p15, cursor: 'pointer' }}>
                <input type="radio" name="rvi" value={p.key} checked={selected === p.key} onChange={() => setSelected(p.key)} />
                <span aria-hidden style={{ width: '11px', height: '11px', borderRadius: '2px', background: p.colour, display: 'inline-block' }} />
                {p.label}
              </label>
            ))}
          </div>
          {selected === 'another' && (
            <input
              type="text" value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={60}
              placeholder="Which party?"
              style={{ ...p15, padding: '7px 10px', border: '1px solid rgba(20,16,13,0.4)', marginBottom: '12px', display: 'block', width: 'min(280px, 100%)', background: '#fff' }}
            />
          )}
          {error && <p style={{ ...p15, color: ACCENT, margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button type="button" onClick={submit} disabled={submitting}
              style={{ ...p15, color: '#f4e8d4', background: INK, border: `1px solid ${INK}`, padding: '9px 18px', cursor: 'pointer' }}>
              {submitting ? 'Saving…' : !user ? 'Log in to vote' : voted ? 'Update vote' : 'Cast your vote'}
            </button>
            {voted && editing && (
              <button type="button" onClick={() => { setEditing(false); setError(null); }}
                style={{ ...p15, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '9px 14px', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '14px' }}>
          <button type="button"
            onClick={() => { setSelected(userVote || ''); setOtherText(userVote === 'another' ? (userVoteText || '') : ''); setError(null); setEditing(true); }}
            style={{ ...p15, background: 'transparent', border: '1px solid rgba(20,16,13,0.4)', padding: '8px 14px', cursor: 'pointer' }}>
            Change your vote
          </button>
        </div>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.55, color: INK, margin: '18px 0 0' }}>
        Readers&rsquo; figures are a self-selected sample of opengovt visitors, one vote per account. They are not a weighted, representative poll and are not directly comparable to the professionally weighted figures above. &ldquo;Another party&rdquo; and &ldquo;wouldn&rsquo;t vote&rdquo; have no pollster equivalent shown.
      </p>
    </section>
  );
}
