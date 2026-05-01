import { supabase } from '@/lib/supabase'
import Navigation from './components/Navigation'
import Link from 'next/link'

export const revalidate = 3600

async function getGovUKNews() {
  try {
    const res = await fetch('https://www.gov.uk/api/search.json?count=4&order=-public_timestamp&filter_content_store_document_type=press_release', { 
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' }
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch (e) {
    console.error('GOV.UK fetch error:', e)
    return []
  }
}

export default async function HomePage() {
  const [news, { data: bills }, { data: activity }, { data: contracts }, { data: donations }, { data: stats }] = await Promise.all([
    getGovUKNews(),
    supabase.from('bill').select('id, title, vote_count_yes, vote_count_no, vote_count_abstain').order('vote_count_yes', { ascending: false }).limit(3),
    supabase.from('ministers_hospitality').select('minister_name, donor, amount, date').order('date', { ascending: false }).limit(5),
    supabase.from('government_contracts').select('title, supplier, value').order('id', { ascending: false }).limit(3),
    supabase.from('political_donations').select('donor_name, recipient_name, amount').order('id', { ascending: false }).limit(3),
    supabase.from('bill').select('id', { count: 'exact', head: true }),
  ])

  const leadStory = news[0]
  const otherNews = news.slice(1, 4)

  return (
    <div className="min-h-screen" style={{ background: '#001520', color: '#ffffff' }}>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* TOP SPLIT */}
        <div className="grid grid-cols-2 gap-px mb-px" style={{ background: '#1c3849' }}>

          {/* Latest GOV.UK news */}
          <div style={{ background: '#001520', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>Latest from GOV.UK</div>
            {leadStory && (
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #1c3849' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: '4px' }}>{leadStory.title}</div>
                <div style={{ fontSize: '14px', color: '#ffffff' }}>{leadStory.organisations?.[0]?.title || 'GOV.UK'} · {new Date(leadStory.public_timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
              </div>
            )}
            {otherNews.map((item: any, i: number) => (
              <div key={i} style={{ paddingBottom: '8px', marginBottom: '8px', borderBottom: '0.5px solid #1c3849' }}>
                <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: '10px', color: '#ffffff', marginTop: '2px' }}>{item.organisations?.[0]?.title || 'GOV.UK'}</div>
              </div>
            ))}
          </div>

          {/* Bills voting bars */}
          <div style={{ background: '#001520', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>The Public vs Parliament</div>
            {bills?.map((bill) => {
              const total = (bill.vote_count_yes || 0) + (bill.vote_count_no || 0)
              const pct = total > 0 ? Math.round((bill.vote_count_yes / total) * 100) : 0
              return (
                <Link href={`/bills/${bill.id}`} key={bill.id} style={{ display: 'block', marginBottom: '1rem', textDecoration: 'none' }}>
                  <div style={{ fontSize: '15px', color: '#fff', marginBottom: '4px', lineHeight: 1.3 }}>{bill.title}</div>
                  <div style={{ height: '3px', background: '#1c3849', borderRadius: '2px', marginBottom: '3px' }}>
                    <div style={{ height: '3px', width: `${pct}%`, background: '#4a8a3a', borderRadius: '2px' }}></div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#ffffff' }}>{pct}% public support · {total.toLocaleString()} votes</div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* LIVE ACTIVITY FEED */}
        <div style={{ background: '#001520', padding: '1rem', borderTop: '1px solid #1c3849', marginBottom: '1px' }}>
          <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>Live Activity</div>
          <div>
            {activity?.map((item, i) => (
              <Link href="/transparency/ministers-hospitality" key={i} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid #1c3849', textDecoration: 'none', alignItems: 'flex-start' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', marginTop: '5px', flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: 1.4 }}>{item.minister_name} — {item.donor} · £{Number(item.amount).toLocaleString()}</div>
                  <div style={{ fontSize: '10px', color: '#ffffff', marginTop: '1px' }}>Ministerial Hospitality · {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CONTRACTS + DONATIONS */}
        <div className="grid grid-cols-2 gap-px mb-px" style={{ background: '#1c3849' }}>
          <div style={{ background: '#001520', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>Latest Contracts</div>
            {contracts?.map((c, i) => (
              <Link href="/transparency/government-contracts" key={i} style={{ display: 'block', padding: '6px 0', borderBottom: '0.5px solid #1c3849', textDecoration: 'none' }}>
                <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.3 }}>{c.title}</div>
                <div style={{ fontSize: '10px', color: '#ffffff', marginTop: '2px' }}>{c.supplier} · £{c.value ? Number(c.value).toLocaleString() : 'undisclosed'}</div>
              </Link>
            ))}
          </div>
          <div style={{ background: '#001520', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>Latest Donations</div>
            {donations?.map((d, i) => (
              <Link href="/transparency/political-donations" key={i} style={{ display: 'block', padding: '6px 0', borderBottom: '0.5px solid #1c3849', textDecoration: 'none' }}>
                <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.3 }}>{d.donor_name}</div>
                <div style={{ fontSize: '10px', color: '#ffffff', marginTop: '2px' }}>{d.recipient_name} · £{Number(d.amount).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-4 gap-px" style={{ background: '#1c3849' }}>
          {[
            { num: '3,884', label: 'Bills tracked' },
            { num: '650', label: 'MPs' },
            { num: '8,011', label: 'Contracts' },
            { num: '21k+', label: 'Records' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#001520', padding: '0.75rem' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{s.num}</div>
              <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* BOTTOM NAV */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1c3849', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { href: '/mps', label: 'MPs' },
            { href: '/departments', label: 'Departments' },
            { href: '/transparency', label: 'Transparency' },
            { href: '/laws', label: 'Laws' },
            { href: '/polls', label: "People's Polls" },
            { href: '/bills', label: 'Bills' },
          ].map((link) => (
            <Link key={link.href} href={link.href} style={{ fontSize: '15px', color: '#ffffff', textDecoration: 'none' }}>{link.label} →</Link>
          ))}
        </div>

      </main>
    </div>
  )
}
