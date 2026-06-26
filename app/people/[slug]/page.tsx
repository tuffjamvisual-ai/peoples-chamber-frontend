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
import ScrollToTopButton from '../../components/ScrollToTopButton';
import PeopleProfileSections, { type Role, type Interest, type PeerFinance } from './PeopleProfileSections';
import OpenGovShell from '../../components/OpenGovShell';
import type { ScsBand } from '@/lib/civil-service-salaries';
import BackLink from '../../components/BackLink';
export const revalidate = 3600;

const INK = '#14100d';
const CREAM = '#ebe5d8';

type Person = {
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
  const [{ data: cached }, { data: ministerRow }, { data: interestRows }, { data: financeRow }] =
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

  // Return a real 404 (not a 200 "Person not found" soft 404) when the
  // slug matches no person. Renders app/people/[slug]/not-found.tsx, which
  // keeps the same OpenGovShell "Person not found." template.
  if (!person) notFound();

  // Bio paragraphs source priority:
  //   1. political_bio (manually authored — overrides anything from gov.uk)
  //   2. biography (gov.uk's HTML body — strip tags into plain paragraphs)
  //   3. description (top-level summary — single paragraph fallback)
  const bioParagraphs = (() => {
    if (!person) return [] as string[];
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
        label="← Back to departments"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

        {person && (
          <>
            {/* Header — dossier polaroid + name + role */}
            <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: '5%', marginBottom: '6%' }}>
              <div
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
                  <div aria-hidden style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d6cdb8', color: INK, fontSize: '64px', fontFamily: 'Special Elite, monospace' }}>
                    {person.name.charAt(0) || '?'}
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/paperclip.webp" alt="" aria-hidden style={{ position: 'absolute', top: '-30px', right: '-5px', width: '65px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
              </div>

              <div style={{ flex: '1 1 auto', marginTop: '6%' }}>
                <div style={{ fontSize: 'clamp(22px, 3.4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', textShadow: '1px 1px 0 rgba(0,0,0,0.1)', lineHeight: 1.05, marginBottom: '4%' }}>{displayName}</div>
                {person.currentRoles[0] && (
                  <div style={{ fontSize: 'clamp(13px, 1.9vw, 25px)', marginBottom: '3%' }}>{person.currentRoles[0].title}</div>
                )}
                {person.currentRoles[0]?.organisation && (
                  <div style={{ fontSize: 'clamp(13px, 1.9vw, 25px)', opacity: 0.7 }}>{person.currentRoles[0].organisation}</div>
                )}
                {/* Salary detail moved to its own sidebar section to
                    avoid the long band+range line wrapping under the
                    polaroid into the folder edge. */}
              </div>
            </div>

            <div style={{ zoom: 1.18 }}>
              <PeopleProfileSections
                paragraphs={bioParagraphs}
                currentRoles={person.currentRoles}
                pastRoles={person.pastRoles}
                interests={interests}
                finance={finance}
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

        <ScrollToTopButton />
    </OpenGovShell>
  );
}
