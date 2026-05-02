import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

export default async function HomePage() {
  const [
    { data: news },
    { data: bills },
    { data: contracts },
    { data: donations },
    { data: revolving },
  ] = await Promise.all([
    supabase.from('press_releases').select('title, description, organisation, published_at, gov_url').order('published_at', { ascending: false }).limit(5),
    supabase.from('bill').select('id, title, vote_count_yes, vote_count_no, vote_count_abstain').order('vote_count_yes', { ascending: false }).limit(3),
    supabase.from('government_contracts').select('title, supplier, value').order('id', { ascending: false }).limit(2),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').order('id', { ascending: false }).limit(2),
    supabase.from('revolving_door').select('person_name, previous_role, organisation').order('id', { ascending: false }).limit(2),
  ])

  const leadStory = news?.[0]
  const otherStories = news?.slice(1, 5) || []
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
      <Navigation />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>

        {/* MASTHEAD */}
        <div style={{ padding: '1.25rem 0', borderBottom: '3px solid #fff', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0' }}>
          <div style={{ fontSize: '11px', color: '#cccccc', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{today}</div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { href: '/bills', label: 'Bills' },
              { href: '/mps', label: 'MPs' },
              { href: '/transparency', label: 'Transparency' },
              { href: '/polls', label: "People's Polls" },
              { href: '/departments', label: 'Departments' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ fontSize: '11px', color: '#ffffff', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* MAIN BODY */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1px', background: '#333', borderBottom: '1px solid #333' }}>

          {/* LEFT - News */}
          <div style={{ background: '#1a1a1a', padding: '1.5rem 2rem' }}>
            {leadStory && (
              <>
                <div style={{ fontSize: '9px', background: '#fff', color: '#000', padding: '2px 8px', display: 'inline-block', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Latest</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: '0.5rem' }}>{leadStory.title}</div>
                <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.6, marginBottom: '0.5rem' }}>{leadStory.description}</div>
                <div style={{ fontSize: '11px', color: '#cccccc', marginBottom: '1.5rem' }}>{leadStory.organisation} · {leadStory.published_at ? new Date(leadStory.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div>
              </>
            )}

            <div style={{ height: '1px', background: '#333', margin: '1rem 0' }}></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {otherStories.map((story, i) => (
                <div key={i} style={{ borderLeft: '2px solid #333', paddingLeft: '0.75rem' }}>
                  <div style={{ fontSize: '9px', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>{story.organisation}</div>
                  <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3 }}>{story.title}</div>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: '#333', margin: '1.5rem 0' }}></div>

            {/* Contracts + Donations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '8px' }}>Latest Contracts</div>
                {contracts?.map((c, i) => (
                  <Link href="/transparency/contracts" key={i} style={{ display: 'block', marginBottom: '10px', textDecoration: 'none', borderLeft: '2px solid #333', paddingLeft: '0.75rem' }}>
                    <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3 }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: '#cccccc', marginTop: '2px' }}>{c.supplier} · £{c.value ? Number(c.value).toLocaleString() : 'undisclosed'}</div>
                  </Link>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '9px', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '8px' }}>Latest Donations</div>
                {donations?.map((d, i) => (
                  <Link href="/transparency/donations" key={i} style={{ display: 'block', marginBottom: '10px', textDecoration: 'none', borderLeft: '2px solid #333', paddingLeft: '0.75rem' }}>
                    <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3 }}>{d.donor_name}</div>
                    <div style={{ fontSize: '11px', color: '#cccccc', marginTop: '2px' }}>{d.recipient_name} · £{Number(d.amount).toLocaleString()}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ background: '#111', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Bills voting */}
            <div>
              <div style={{ fontSize: '9px', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid #222', paddingBottom: '6px', marginBottom: '1rem' }}>Public vs Parliament</div>
              {bills?.map((bill) => {
                const total = (bill.vote_count_yes || 0) + (bill.vote_count_no || 0) + (bill.vote_count_abstain || 0)
                const yesPct = total > 0 ? Math.round((bill.vote_count_yes || 0) / total * 100) : 0
                const noPct = total > 0 ? Math.round((bill.vote_count_no || 0) / total * 100) : 0
                return (
                  <Link href={`/bills/${bill.id}`} key={bill.id} style={{ display: 'block', marginBottom: '1rem', textDecoration: 'none' }}>
                    <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3, marginBottom: '4px' }}>{bill.title}</div>
                    <div style={{ height: '3px', background: '#222', display: 'flex', marginBottom: '3px' }}>
                      {yesPct > 0 && <div style={{ height: '100%', width: `${yesPct}%`, background: '#4a8a3a' }}></div>}
                      {noPct > 0 && <div style={{ height: '100%', width: `${noPct}%`, background: '#8a3a3a' }}></div>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cccccc' }}>{yesPct}% support · {total.toLocaleString()} votes</div>
                  </Link>
                )
              })}
            </div>

            {/* Revolving door */}
            <div>
              <div style={{ fontSize: '9px', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.2em', borderBottom: '1px solid #222', paddingBottom: '6px', marginBottom: '1rem' }}>Revolving Door</div>
              {revolving?.map((r, i) => (
                <Link href="/transparency/revolving-door" key={i} style={{ display: 'block', marginBottom: '10px', textDecoration: 'none' }}>
                  <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.3 }}>{r.person_name}</div>
                  <div style={{ fontSize: '11px', color: '#cccccc', marginTop: '2px' }}>{r.previous_role}</div>
                </Link>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
              {[
                { num: '3,884', label: 'Bills' },
                { num: '650', label: 'MPs' },
                { num: '8,011', label: 'Contracts' },
                { num: '21k+', label: 'Records' },
              ].map((s, i) => (
                <div key={i} style={{ border: '1px solid #222', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{s.num}</div>
                  <div style={{ fontSize: '9px', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
