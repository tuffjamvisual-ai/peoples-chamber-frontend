import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import '../../components/magazine-layout.css';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import MagazineProfileSections from './MagazineProfileSections';
import {
  MP_BASE_SALARY_2026,
  MINISTERIAL_SUPPLEMENT,
  SALARY_BAND_LABEL,
  type SalaryBand,
} from '@/lib/ministerial-salaries';

const BAND_RANK: Record<SalaryBand, number> = { pm: 4, sos: 3, minister_of_state: 2, puss: 1 };

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Prerender every current MP at build time so every visit is instant
// from the edge cache. Build-time per-page budget on Vercel is 60s;
// query trims below (mp_expenses_detail row-cap + lean selects on
// votes and sponsored bills) keep each page well under that.
// dynamicParams defaults to true — any MP missing from this list (e.g.
// a freshly elected one not yet in the table) still renders on-demand.
export async function generateStaticParams() {
  const { data } = await supabase
    .from('mps')
    .select('member_id')
    .eq('current_member', true);
  return (data || []).map((m) => ({ id: String(m.member_id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  const { data: mp } = await supabase
    .from('mps')
    .select('name, display_name, constituency, party')
    .eq('member_id', memberId)
    .single();
  if (!mp) return { title: 'MP profile' };
  const name = mp.display_name || mp.name;
  const subtitle = [mp.party, mp.constituency].filter(Boolean).join(' · ');
  return {
    title: name,
    description: `${name}${subtitle ? ` — ${subtitle}.` : '.'} Voting record, registered interests, sponsored bills and contact details.`,
    alternates: { canonical: `/mps/${memberId}` },
  };
}

export default async function MPMagazineProfile({ params }: PageProps) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) notFound();

  // All 10 fetches in one parallel round-trip. The mp lookup was previously
  // awaited before this block, costing an extra serial round-trip on every
  // cold render. The notFound() check happens after — for valid member_ids
  // we save ~200-400ms; for invalid ones, the wasted concurrent queries
  // are negligible (notFound() short-circuits the render).
  const [
    mpRes,
    contactRes,
    bioRes,
    sponsoredBillsRes,
    votesRes,
    interestsRes,
    expensesRes,
    expensesDetailRes,
    ministerialRowsRes,
    outsideRowRes,
  ] = await Promise.all([
    supabase.from('mps').select('*').eq('member_id', memberId).single(),
    supabase.from('mp_contact').select('*').eq('member_id', memberId).single(),
    supabase.from('mp_biography').select('*').eq('member_id', memberId).single(),
    supabase
      .from('bill')
      .select('id, title, status, current_stage, plain_summary, is_act, last_update')
      .eq('sponsor_member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('mp_division_votes')
      .select('id, division_title, division_date, vote_type, is_rebellion')
      .eq('member_id', memberId)
      .order('division_date', { ascending: false })
      .range(0, 199),
    supabase.from('mp_registered_interests').select('*').eq('member_id', memberId).order('category_sort_order', { ascending: true }),
    supabase.from('mp_expenses_summary').select('*').eq('member_id', memberId).order('year', { ascending: false }),
    supabase
      .from('mp_expenses_detail')
      .select('claim_number, year, claim_date, category, cost_type, short_description, amount_paid, status')
      .eq('member_id', memberId)
      .order('claim_date', { ascending: false })
      .range(0, 199),
    supabase.from('dept_ministers').select('salary_band').eq('member_id', memberId).not('salary_band', 'is', null),
    supabase.from('mp_outside_earnings_summary').select('total_extracted, claim_count, source_count').eq('member_id', memberId).maybeSingle(),
  ]);
  const mp = mpRes.data;
  if (!mp) notFound();

  let highestBand: SalaryBand | null = null;
  for (const r of ministerialRowsRes.data || []) {
    const b = r.salary_band as SalaryBand | null;
    if (!b) continue;
    if (!highestBand || BAND_RANK[b] > BAND_RANK[highestBand]) highestBand = b;
  }

  const ministerialAmount = highestBand ? MINISTERIAL_SUPPLEMENT[highestBand] : 0;
  const outsideAmount = outsideRowRes.data?.total_extracted ? Number(outsideRowRes.data.total_extracted) : 0;
  const latestExpense = (expensesRes.data && expensesRes.data[0]) || null;
  const earnings = {
    base: MP_BASE_SALARY_2026,
    band: highestBand,
    band_label: highestBand ? SALARY_BAND_LABEL[highestBand] : null,
    ministerial: ministerialAmount,
    outside: outsideAmount,
    outside_claim_count: outsideRowRes.data?.claim_count || 0,
    outside_source_count: outsideRowRes.data?.source_count || 0,
    personal_total: MP_BASE_SALARY_2026 + ministerialAmount + outsideAmount,
    public_spend: latestExpense?.total_spend ? Number(latestExpense.total_spend) : 0,
    public_spend_year: latestExpense?.year || null,
  };

  const fullName = mp.display_name || mp.name || '';
  const partyColour = mp.party_colour ? `#${mp.party_colour.replace('#', '')}` : '#7697a2';

  // First-elected date: prefer mps.start_date, else earliest representation startDate.
  const repDates = (bioRes.data?.representations || [])
    .map((r: { startDate?: string | null }) => r.startDate)
    .filter((d: string | null | undefined): d is string => !!d)
    .sort();
  const firstElectedRaw = mp.start_date || repDates[0] || null;
  const firstElected = firstElectedRaw
    ? new Date(firstElectedRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1086px',
      margin: '0 auto',
      background: '#2a1810',
      backgroundImage:
        'url("/preview-header.webp"), url("/preview-footer.webp"), url("/preview-middle.webp")',
      backgroundRepeat: 'no-repeat, no-repeat, repeat-y',
      backgroundPosition: 'top center, bottom center, top center',
      backgroundSize: '100% auto, 100% auto, 100% auto',
    }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
          pointerEvents: 'none',
        }}
      />

      <nav
        aria-label="Site"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          aspectRatio: '1023 / 330',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {([
          ['/',            'Home',           5,    9],
          ['/bills',       'Bills',          16,   8],
          ['/laws',        'Laws',           25,   7],
          ['/polls',       "People's Polls", 34,   14],
          ['/mps',         'MPs',            50,   7],
          ['/departments', 'Departments',    59,   15],
          ['/login',       'Login',          76,   8],
          ['/about',       'About',          87,   9],
        ] as const).map(([href, label, left, width]) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              position: 'absolute',
              top: '87%',
              left: `${left}%`,
              width: `${width}%`,
              height: '10%',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        ))}
      </nav>

      <div className="magazine-content-spacing" style={{ position: 'relative', zIndex: 2, color: '#14100d', fontFamily: 'Special Elite, monospace' }}>
        <a
          href="/mps"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            color: '#14100d',
            textDecoration: 'none',
            fontSize: '16px',
            transform: 'rotate(-0.2deg)',
          }}
        >
          ← Back to all MPs
        </a>
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '40px', marginBottom: '30px' }}>
          <div style={{
            position: 'relative',
            background: '#ebe5d8',
            padding: '12px 12px 48px 12px',
            width: '284px',
            marginTop: '-20px',
            marginRight: '-40px',
            transform: 'rotate(15deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
            filter: 'contrast(1.05) brightness(0.98)',
          }}>
            {mp.photo_url ? (
              <Image
                src={mp.photo_url}
                alt={fullName}
                width={260}
                height={260}
                priority
                sizes="260px"
                style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: '260px',
                  height: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#d6cdb8',
                  color: '#14100d',
                  fontSize: '64px',
                  fontFamily: 'Special Elite, monospace',
                }}
              >
                {fullName.charAt(0) || '?'}
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/paperclip.png"
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                top: '-30px',
                right: '-5px',
                width: '65px',
                height: 'auto',
                transform: 'rotate(180deg)',
                transformOrigin: 'center',
                pointerEvents: 'none',
                zIndex: 3,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '38px',
              marginTop: '20px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#14100d',
              fontFamily: 'Special Elite, monospace',
              transform: 'rotate(-0.3deg)',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
              letterSpacing: '-0.02em',
            }}>
              {fullName}
            </h1>
            <p style={{ fontSize: '22px', marginBottom: '8px', color: '#14100d', transform: 'rotate(0.2deg)' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: partyColour, marginRight: '8px' }}></span>
              {[mp.party, mp.constituency].filter(Boolean).join(' • ')}
            </p>
            {firstElected && (
              <p style={{ fontSize: '14px', marginBottom: '4px', color: '#14100d', opacity: 0.8, transform: 'rotate(-0.1deg)' }}>
                First elected: {firstElected}
              </p>
            )}
          </div>
        </div>

        <MagazineProfileSections
          memberId={memberId}
          paragraphs={(bioRes.data?.political_bio ?? '').split(/\n\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0)}
          contact={{
            // Prefer mp_contact, fall back to fields on the mps row.
            phone:          contactRes.data?.phone         ?? mp.phone         ?? null,
            email:          contactRes.data?.email         ?? mp.email         ?? null,
            website:        contactRes.data?.website       ?? mp.website       ?? null,
            twitter:        contactRes.data?.twitter       ?? mp.twitter       ?? null,
            address_line1:  contactRes.data?.address_line1 ?? null,
            postcode:       contactRes.data?.postcode      ?? null,
          }}
          votes={votesRes.data || []}
          sponsoredBills={sponsoredBillsRes.data || []}
          interests={interestsRes.data || []}
          bio={bioRes.data}
          earnings={earnings}
          expenses={expensesRes.data || []}
          expensesDetail={expensesDetailRes.data || []}
        />

        <ScrollToTopButton />
      </div>
    </div>
  );
}
