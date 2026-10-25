// Parties index — /parties (25 Oct 2026, report 64). Every party Open Govt covers, in the menu's order (lib/site-nav.ts),
// each card linking to the party's page with its description (lib/page-descriptions.ts) and its number of current MPs.
// The 2024 manifesto comparison that used to live here is /parties/manifestos.

import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import SectionLinks from '../components/SectionLinks';
import { NAV } from '@/lib/site-nav';
import { PAGE_DESCRIPTIONS, PARTY_NAMES, partyDescription } from '@/lib/page-descriptions';
import { normaliseParty } from '@/lib/party-helpers';
import { fitTitle } from '@/lib/seo-title';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: fitTitle('UK Political Parties: Promises, Record and Donations', 'UK Parties: Promises, Record and Donations'),
  description: PAGE_DESCRIPTIONS['/parties'],
  alternates: { canonical: '/parties' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const CARDS_CSS = '.og-pcards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 14px}@media (max-width:900px){.og-pcards{grid-template-columns:repeat(2,1fr)}}@media (max-width:520px){.og-pcards{grid-template-columns:1fr}}';

// The parties in the menu's order: the Parties group's party links (/parties/<slug>/bio) in lib/site-nav.ts.
const SLUGS = NAV.find((n) => n.label === 'Parliament')!.children!
  .filter((c) => c.group === 'Parties' && /^\/parties\/[^/]+\/bio$/.test(c.href))
  .map((c) => c.href.split('/')[2]);

// Current MPs per party: the MP roster (mps, current_member), which /api/sync-mp-roster keeps in step with the UK
// Parliament Members API every day. Grouped as /mps groups them (normaliseParty folds Labour (Co-op) into Labour) and
// matched to each party by parties.mp_party_string.
async function currentMps(): Promise<Map<string, number>> {
  const [{ data: mps, error: mErr }, { data: parties, error: pErr }] = await Promise.all([
    supabase.from('mps').select('party').eq('current_member', true),
    supabase.from('parties').select('slug, mp_party_string'),
  ]);
  if (mErr) throw new Error(`/parties mps: ${mErr.message}`);
  if (pErr) throw new Error(`/parties parties: ${pErr.message}`);
  const byGroup = new Map<string, number>();
  for (const m of mps ?? []) byGroup.set(normaliseParty(m.party), (byGroup.get(normaliseParty(m.party)) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const p of parties ?? []) if (p.mp_party_string) out.set(p.slug, byGroup.get(p.mp_party_string) ?? 0);
  return out;
}

export default async function PartiesIndexPage() {
  const mpCounts = await currentMps();
  return (
    <OpenGovShell pageStamp="Parties">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <SectionLinks section="Parties" />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Parties
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK, margin: 0 }}>
          The {SLUGS.length} parties Open Govt covers: what each promised, what it has done, who funds it and how its MPs vote.
        </p>
      </header>

      <style>{CARDS_CSS}</style>
      <div className="og-pcards">
        {SLUGS.map((slug) => {
          const n = mpCounts.get(slug);
          return (
            <Link
              key={slug}
              href={`/parties/${slug}`}
              className="no-hover-scale"
              style={{ display: 'block', textDecoration: 'none', color: INK, border: `1px solid ${HAIRLINE}`, padding: '12px 14px 14px', minHeight: '44px' }}
            >
              <div style={{ fontFamily: MONO, fontSize: '19px', fontWeight: 'bold', marginBottom: '4px' }}>
                {PARTY_NAMES[slug]} <span style={{ color: ACCENT }}>→</span>
              </div>
              {n != null && (
                <div style={{ fontFamily: MONO, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  {n.toLocaleString('en-GB')} current MP{n === 1 ? '' : 's'}
                </div>
              )}
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: INK, margin: 0 }}>{partyDescription(PARTY_NAMES[slug])}</p>
            </Link>
          );
        })}
      </div>

      <p style={{ fontSize: '14px', lineHeight: 1.6, color: INK, margin: '14px 0 0' }}>
        Current MPs: the MP roster, kept in step with the UK Parliament Members API each day, grouped as on{' '}
        <Link href="/mps" className="no-hover-scale" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All MPs</Link>
        {' '}(Labour includes Labour and Co-operative MPs).
      </p>

      <p style={{ margin: '28px 0 0' }}>
        <Link href="/parties/manifestos" className="no-hover-scale" style={{ fontFamily: MONO, fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 'bold', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '4px', display: 'inline-block', padding: '6px 0' }}>
          Compare the 2024 manifestos →
        </Link>
      </p>
    </OpenGovShell>
  );
}
