// Magazine-template profile for peers + civil servants. The hero
// geometry is intentionally identical to /mps/[id] (row-reverse,
// 284px polaroid, 260x260 photo, rotate 15deg, paperclip overlay) so
// /mps/[id] and /people/[slug] read as the same magazine.
//
// Data:
//   - person_cache: name, photo, current_roles, past_roles, political_bio
//   - dept_ministers fallback: photo if cache empty (e.g. new appointee)
//   - mp_interests: registered interests, joined by member_slug

import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PeopleProfileSections, { type Role, type Interest, type PeerFinance } from './PeopleProfileSections';
import OpenGovShell from '../../components/OpenGovShell';
import type { ScsBand } from '@/lib/civil-service-salaries';
import { resolvePersonName } from '@/lib/person-name';
import { ministerialRateForSlug, ministerialSalaryText } from '@/lib/ministerial-salaries';
import Link from 'next/link';
import BackLink from '../../components/BackLink';
import { phoneUpTo } from '@/lib/breakpoints';
export const revalidate = 21600;

export async function generateStaticParams() {
  const { data, error } = await supabase
    .from('person_cache')
    .select('slug')
    .limit(20);
  if (error || !data?.length) throw new Error(`generateStaticParams person_cache: ${error?.message || 'zero rows'}`);
  const slugs = data.map((r) => String(r.slug)).filter(Boolean);
  if (!slugs.length) throw new Error('generateStaticParams people: zero usable values');
  return slugs.map((slug) => ({ slug }));
}

const INK = '#14100d';
const CREAM = '#ebe5d8';

type Person = {
  caricature: boolean;
  name: string;
  photo: string;
  currentRoles: Role[];
  pastRoles: Role[];
  politicalBio: string | null;
  // Captured from gov.uk per-person API (sync-person-cache):
  biography: string;   // HTML, gov.uk details.body
  description: string; // short top-level summary
  privyCounsellor: boolean;
  scsBand: ScsBand | null;
  actualPayFloor: number | null;
  actualPayCeiling: number | null;
  payPeriod: string | null;
  fte: number | null;
};

async function getPersonAndInterests(
  slug: string,
): Promise<{ person: Person | null; interests: Interest[]; finance: PeerFinance | null }> {
  const [{ data: cached, error: cachedErr }, { data: ministerRow }, { data: interestRows }, { data: financeRow }] =
    await Promise.all([
      supabase
        .from('person_cache')
        .select('name, photo, current_roles, past_roles, political_bio, biography, description, privy_counsellor, scs_band, actual_pay_floor, actual_pay_ceiling, pay_period, fte')
        .eq('slug', slug)
        .maybeSingle(),
      supabase
        .from('dept_ministers')
        .select('photo_url, name')
        .eq('slug', slug)
        .maybeSingle(),
      supabase
        .from('mp_interests')
        .select('category, summary, detail, registered_date')
        .eq('member_slug', slug)
        .order('registered_date', { ascending: false }),
      supabase
        .from('peer_finance')
        .select('ministerial_salary_annual, attendance_allowance_ytd, attendance_days_ytd, expenses_total_ytd, period_label, ministerial_source_url, expenses_source_url')
        .eq('slug', slug)
        .maybeSingle(),
    ]);
  if (cachedErr) throw new Error(`person ${slug}: ${cachedErr.message}`);

  const interests = (interestRows || []) as Interest[];
  const finance = (financeRow as PeerFinance | null) || null;

  if (cached) {
    return {
      person: {
        name: cached.name,
        // Prefer the manually-uploaded dept_ministers photo over the
        // gov.uk-synced one in person_cache. Manual uploads are the
        // authoritative source — sync runs would otherwise overwrite
        // them on the next refresh.
        photo: ministerRow?.photo_url || cached.photo || '',
        // Manually uploaded pictures (dept_ministers.photo_url) are the site's caricatures.
        caricature: !!ministerRow?.photo_url,
        currentRoles: (cached.current_roles as Role[]) || [],
        pastRoles: (cached.past_roles as Role[]) || [],
        politicalBio: (cached.political_bio as string | null) || null,
        biography: (cached.biography as string) || '',
        description: (cached.description as string) || '',
        privyCounsellor: !!cached.privy_counsellor,
        scsBand: (cached.scs_band as ScsBand | null) ?? null,
        actualPayFloor: (cached.actual_pay_floor as number | null) ?? null,
        actualPayCeiling: (cached.actual_pay_ceiling as number | null) ?? null,
        payPeriod: (cached.pay_period as string | null) ?? null,
        fte: (cached.fte as number | null) ?? null,
      },
      interests,
      finance,
    };
  }

  if (ministerRow) {
    return {
      person: {
        name: ministerRow.name || '',
        photo: ministerRow.photo_url || '',
        caricature: !!ministerRow.photo_url,
        currentRoles: [],
        pastRoles: [],
        politicalBio: null,
        biography: '',
        description: '',
        privyCounsellor: false,
        scsBand: null,
        actualPayFloor: null,
        actualPayCeiling: null,
        payPeriod: null,
        fte: null,
      },
      interests,
      finance,
    };
  }

  return { person: null, interests, finance };
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { person, interests, finance } = await getPersonAndInterests(slug);
  // A Lords minister's salary (owner, 7 Nov 2026, N1): their GOV.UK category's claimed and entitled amounts from
  // ministerial_salary_rates, found by their GOV.UK slug in dept_ministers. MPs' pay is on their MP page.
  const peerRate = person ? await ministerialRateForSlug(slug) : null;
  const isPeer = !!person && /^(the\s+)?(rt\.?\s+hon\.?\s+)?(lord|baroness)\b/i.test(person.name);
  const ministerialPay = peerRate && peerRate !== 'unfiled'
    ? (peerRate.house === 'Lords' ? { text: ministerialSalaryText(peerRate), pending: false } : null)
    : peerRate === 'unfiled' && isPeer ? { text: null, pending: true } : null;

  // Return a real 404 (not a 200 "Person not found" soft 404) when the
  // slug matches no person. Renders app/people/[slug]/not-found.tsx, which
  // keeps the same OpenGovShell "Person not found." template.
  if (!person) notFound();

  // Bio paragraphs source priority:
  //   1. political_bio (manually authored — overrides anything from gov.uk)
  //   2. biography (gov.uk's HTML body — strip tags into plain paragraphs)
  //   3. description (top-level summary — single paragraph fallback)
  // Biographies on these profiles (ministers, officials, board members) are hidden for
  // now, as on MP profiles (owner's instruction, 18 Oct 2026). Set to true to restore;
  // the text is unchanged in the database.
  const SHOW_PERSON_BIO = false;
  const bioParagraphs = (() => {
    if (!person || !SHOW_PERSON_BIO) return [] as string[];
    if (person.politicalBio) {
      return person.politicalBio.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    }
    if (person.biography) {
      // gov.uk body is HTML with <p>, <ul>, <li>. Split on </p> /
      // </li> boundaries then strip remaining tags + entities.
      return person.biography
        .replace(/<li>/gi, '<p>• ')
        .replace(/<\/li>/gi, '</p>')
        .split(/<\/p>/i)
        .map((seg) =>
          seg.replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim(),
        )
        .filter(Boolean);
    }
    if (person.description) return [person.description.trim()];
    return [];
  })();

  // Official photographs are shown only for MPs (owner's instruction, 18 Oct 2026); the
  // site's caricatures always stay. Civil servants, board members and other officials
  // without a caricature show no picture. A sitting MP is matched by name (lib/person-name.ts).
  const resolved = person?.name ? await resolvePersonName(person.name) : null;
  const isMp = !!resolved?.isMp;
  if (person && resolved) person.name = resolved.name;

  // Prefix "The Rt Hon" if gov.uk flagged them PC and the rendered
  // name doesn't already carry the honorific.
  const displayName = person
    ? person.privyCounsellor && !/(rt\.?\s*hon|right honourable)/i.test(person.name)
      ? `The Rt Hon ${person.name}`
      : person.name
    : '';

  return (
    <OpenGovShell pageStamp="Profile">
        <BackLink
        fallbackHref="/departments"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

        {person && (
          <>
            {/* Phones under 640px (owner, 7 Nov 2026, PF1): the MP profile's phone header, a 72px photo beside the name with no
                rotation and no negative margins, so nothing is pushed past the screen's edge, and the sections start below the
                opening without the desktop's upward nudge or zoom. From 640px up nothing changes. */}
            <style>{`
              @media ${phoneUpTo(767.98)} {
                .pp-header { flex-direction: row !important; align-items: center !important; gap: 12px !important; margin-bottom: 12px !important; }
                .pp-photo { margin: 0 !important; padding: 4px !important; transform: none !important; }
                .pp-photo img, .pp-photo > div { width: 72px !important; height: 72px !important; font-size: 32px !important; }
                .pp-photo .pp-paperclip { display: none !important; }
                .pp-name { margin-top: 0 !important; min-width: 0; }
                .pp-name h1 { font-size: 24px !important; margin: 0 0 4px !important; overflow-wrap: anywhere; }
                .pp-sections { zoom: 1 !important; }
                .pp-sections .pp-sections-grid { margin-top: 16px !important; }
              }
            `}</style>
            {/* Header — dossier polaroid + name + role */}
            <div className="pp-header" style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: '5%', marginBottom: '6%' }}>
              {(isMp || person.caricature) && (
              <div
                className="pp-photo"
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  marginTop: '-7%',
                  marginRight: '-6%',
                  background: CREAM,
                  padding: '12px 12px 48px 12px',
                  transform: 'rotate(12deg)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
                  filter: 'contrast(1.05) brightness(0.98)',
                }}
              >
                {person.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={person.photo}
                    alt={person.name}
                    style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
                  />
                ) : (
                  <div aria-hidden style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d6cdb8', color: INK, fontSize: '64px', fontFamily: 'var(--font-special-elite), monospace' }}>
                    {person.name.charAt(0) || '?'}
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pp-paperclip" src="/paperclip.webp" alt="" aria-hidden style={{ position: 'absolute', top: '-30px', right: '-5px', width: '65px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
              </div>
              )}

              <div className="pp-name" style={{ flex: '1 1 auto', marginTop: '6%' }}>
                <h1 style={{ fontSize: 'clamp(22px, 3.4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', textShadow: '1px 1px 0 rgba(0,0,0,0.1)', lineHeight: 1.05, marginTop: 0, marginBottom: '4%' }}>{displayName}</h1>
                {person.currentRoles[0] && (
                  <div style={{ fontSize: 'clamp(15px, 1.9vw, 25px)', marginBottom: '3%' }}>{person.currentRoles[0].title}</div>
                )}
                {person.currentRoles[0]?.organisation && (
                  <div style={{ fontSize: 'clamp(15px, 1.9vw, 25px)' }}>{person.currentRoles[0].organisation}</div>
                )}
                {/* Salary detail moved to its own sidebar section to
                    avoid the long band+range line wrapping under the
                    polaroid into the folder edge. */}
              </div>
            </div>

            {/* Opening (owner, 7 Nov 2026, L2): "[Name] is [role]." from the page's own record (person_cache, the first
                current role as shown above, official title exact), and, for a sitting MP, a link to their MP page. */}
            {(person.currentRoles[0]?.title || resolved?.memberId) && (
              <div data-main-action style={{ maxWidth: '46em', fontSize: '16px', lineHeight: 1.7, marginBottom: '4%' }}>
                {person.currentRoles[0]?.title && (
                  <p style={{ margin: '0 0 8px' }}>{person.name} is {person.currentRoles[0].title.replace(/\s+/g, ' ').trim()}.</p>
                )}
                {resolved?.memberId && (
                  <p style={{ margin: 0 }}>
                    <Link href={`/mps/${resolved.memberId}`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', display: 'inline-block', padding: '10px 0' }}>Salary, expenses and votes as an MP</Link>
                  </p>
                )}
              </div>
            )}

            <div className="pp-sections" style={{ zoom: 1.18 }}>
              <PeopleProfileSections
                paragraphs={bioParagraphs}
                currentRoles={person.currentRoles}
                pastRoles={person.pastRoles}
                interests={interests}
                finance={finance}
                ministerialPay={ministerialPay}
                salary={{
                  scsBand: person.scsBand,
                  actualPayFloor: person.actualPayFloor,
                  actualPayCeiling: person.actualPayCeiling,
                  payPeriod: person.payPeriod,
                  fte: person.fte,
                }}
              />
            </div>
          </>
        )}

    </OpenGovShell>
  );
}
