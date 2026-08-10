'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink'

const INK = '#14100d'
const ACCENT = '#7a1612'
const SUCCESS = '#4e6b34'
const DANGER = '#8a2f20'
const HAIRLINE = 'rgba(20,16,13,0.25)'
const MONO = 'Special Elite, monospace'

type BillVote = { id: number; title: string; choice: string; created_at: string | null }
type PollVote = { id: number; question: string; tag: string | null; choice: string; created_at: string | null }

function label(c: string) { return c === 'yes' ? 'Aye' : c === 'no' ? 'No' : c === 'abstain' ? 'Abstain' : c }
function colour(c: string) { return c === 'yes' ? SUCCESS : c === 'no' ? DANGER : INK }

function Badge({ choice }: { choice: string }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: colour(choice), borderRadius: '2px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {label(choice)}
    </span>
  )
}

export default function AccountPage() {
  const { user, logout } = useAuth()
  const [data, setData] = useState<{ bills: BillVote[]; polls: PollVote[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetch('/api/account/history?userId=' + user.id)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  return (
    <OpenGovShell pageStamp="Account">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '16px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
        Your account
      </h1>

      {!user ? (
        <div style={{ fontSize: '16px', lineHeight: 1.8, color: INK }}>
          <p>You need to be logged in to see your account and voting history.</p>
          <a href="/login" className="no-hover-scale" style={{ display: 'inline-block', marginTop: '8px', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT, textDecoration: 'underline' }}>
            Log in or create an account →
          </a>
        </div>
      ) : (
        <>
          {/* Account details */}
          <div style={{ borderTop: `2px solid ${ACCENT}`, paddingTop: '14px', marginBottom: '32px' }}>
            <div style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 2, color: INK }}>
              {user.username && <div><strong>Username:</strong> {user.username}</div>}
              <div><strong>Email:</strong> {user.email}</div>
              {user.postcode && <div><strong>Postcode:</strong> {user.postcode}</div>}
            </div>
            <button
              onClick={logout}
              style={{ marginTop: '14px', fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: ACCENT, border: 'none', borderRadius: '3px', padding: '8px 16px', cursor: 'pointer' }}
            >
              Log out
            </button>
          </div>

          {loading && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>Loading your votes…</p>}

          {data && (
            <>
              {/* Bill votes */}
              <section style={{ marginBottom: '36px' }}>
                <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '12px' }}>
                  Bills you have voted on ({data.bills.length})
                </h2>
                {data.bills.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>You have not voted on any bills yet.</p>}
                {data.bills.map((b) => (
                  <a key={b.id} href={`/bills/${b.id}`} className="no-hover-scale" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '10px 0' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: 1.3 }}>{b.title}</span>
                    <Badge choice={b.choice} />
                  </a>
                ))}
              </section>

              {/* Poll votes */}
              <section>
                <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, paddingBottom: '6px', marginBottom: '12px' }}>
                  Polls you have voted on ({data.polls.length})
                </h2>
                {data.polls.length === 0 && <p style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>You have not voted on any polls yet.</p>}
                {data.polls.map((p) => (
                  <a key={p.id} href="/polls" className="no-hover-scale" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', textDecoration: 'none', color: INK, borderBottom: `1px solid ${HAIRLINE}`, padding: '10px 0' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: 1.3 }}>{p.question}</span>
                    <Badge choice={p.choice} />
                  </a>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </OpenGovShell>
  )
}
