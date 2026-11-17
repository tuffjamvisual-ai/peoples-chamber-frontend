import { permanentRedirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LawsClient from './LawsClient'
import OpenGovShell from '../components/OpenGovShell'
import BackLink from '../components/BackLink';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

const PER_PAGE = 20;

// The Acts list for one page (F04 batch 2, T2's f04-32-routes.md 6): /laws is page 1 and /laws/page/<n> the rest, each a
// static page rebuilt only when the bill tag is refreshed. The page number comes from the path, never the query.
export default async function LawsListing({ page }: { page: number }) {
  const { data: laws, error } = await cachedQuery(['q:app/laws/page.tsx:8e1997d987'], tableTags('bill'), () => supabase
    .from('bill')
    .select(
      // Same select shape as /bills so the shared BillCoverCard
      // renders identically on /laws (with an extra Royal Assent stamp).
      'id, parliament_id, title, plain_summary, description, long_title, current_stage, originating_house, sponsor_name, sponsor_party, sponsor_party_colour, last_update, stage_date, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, commons_vote_date, is_act'
    )
    .eq('is_act', true)
    .is('hidden_reason', null)
    .order('last_update', { ascending: false })
    .range(0, 4999))

  if (error) console.error('Error fetching laws:', error)
  // Past the last page: the last page, as LawsClient's clamp did in the browser.
  const last = Math.max(1, Math.ceil((laws?.length || 0) / PER_PAGE))
  if (page > last) permanentRedirect(last === 1 ? '/laws' : `/laws/page/${last}`)

  return (
    <OpenGovShell pageStamp="Acts of Parliament">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Laws of the Land
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px' }}>
          Bills that have received Royal Assent. The Acts that govern the country, ordered by most recent.
        </p>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px' }}>
          {(laws?.length || 0).toLocaleString()} Acts on the statute book
        </p>
      </header>

      <LawsClient laws={laws || []} page={page} />

    </OpenGovShell>
  )
}
