// Constituency association pages (/donations/constituencies/<slug>), keyed by party and accounting unit (24 Oct 2026,
// report 38). Each Electoral Commission donation to a party names the accounting unit that kept it. Different parties
// use the same unit names ("Bath", "London", "Central Party"), so a page keyed by the unit name alone mixed parties:
// /donations/constituencies/central-party added up every party's national accounts (22,764 donations from 96 parties).
//
// A page is now one party's unit:
// - a unit name only one party uses keeps its URL, /donations/constituencies/<unit slug>;
// - a unit name several parties use gets one page per party, /donations/constituencies/<unit slug>-<party slug>
//   (for example bath-liberal-democrats), and the old URL becomes a chooser listing each party's unit;
// - national headquarters units ("Central Party") are national party accounts, not constituency associations: they
//   are left out of the association list and their URL is a chooser linking to each party's money page.
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';

export function unitNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[/']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// A party's name as registered, without the register's notes: "[De-registered 08/01/16]", a bracketed short name
// ("Scottish National Party (SNP)") or a dashed alternative ("Democratic Unionist Party - D.U.P."). Spellings that
// differ only by these are one party.
export function partyName(recipient: string | null): string {
  return (recipient || '')
    .replace(/\s*\[De-registered[^\]]*\]\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+-\s+.*$/, '')
    .trim() || '(party not named)';
}

// National headquarters units: national party accounts, not constituency associations.
export function isNationalUnit(unitName: string): boolean {
  const t = unitName.trim().toLowerCase();
  return t === 'central party' || t === 'central office' || t === 'head office' || t === 'headquarters' || t === 'national party';
}

export type PartyRef = { name: string; slug: string; moneySlug: string | null };

// The site's party slugs (parties table), so association URLs use /parties/<slug> names where a party has a page;
// other parties use their name as a slug. moneySlug is set only where /parties/<slug>/money reads this party's records
// (its parties.recipient_name is the name on the donations).
export const partyRefs = cache(async (): Promise<(recipient: string | null) => PartyRef> => {
  const { data, error } = await supabase.from('parties').select('slug, recipient_name');
  if (error) throw new Error(`association units parties: ${error.message}`);
  const bySlugName = new Map<string, { slug: string; recipient: string }>();
  for (const p of (data ?? []) as { slug: string; recipient_name: string | null }[]) {
    if (p.recipient_name) bySlugName.set(partyName(p.recipient_name), { slug: p.slug, recipient: p.recipient_name });
  }
  return (recipient) => {
    const name = partyName(recipient);
    const known = bySlugName.get(name);
    return {
      name,
      slug: known?.slug ?? unitNameToSlug(name),
      moneySlug: known && known.recipient === recipient ? known.slug : null,
    };
  };
});

export type UnitRow = {
  id: number;
  donor_name: string | null;
  donor_type: string | null;
  recipient_name: string | null;
  accounting_unit_name: string | null;
  amount: number | null;
  accepted_date: string | null;
  nature: string | null;
};

// Every donation whose accounting unit has this slug, largest first. Read with the slug's longest words, then matched
// exactly on the slug. Throws on a failed read (lib/read-all.ts).
// The words are matched as patterns that allow for what the slug drops (24 Oct 2026, report 38): "and" may be stored
// as "&" (so it is not used), and an apostrophe or slash may sit inside a word ("johns" for "John's"). A plain
// ilike on the slug's words missed those units: "beverley-and-holderness" was a 404.
function wordPattern(word: string): string {
  return word.split('').join("['/]?");
}

export const rowsForUnitSlug = cache(async (slug: string): Promise<UnitRow[]> => {
  const tokens = slug.split('-').filter((t) => t.length >= 2 && t !== 'and');
  if (tokens.length === 0) return [];
  const ranked = tokens.slice().sort((a, b) => b.length - a.length).slice(0, 3);
  const raw = await readAll<UnitRow>(() => supabase.from('political_donations'), {
    columns: 'id, donor_name, donor_type, recipient_name, accounting_unit_name, amount, accepted_date, nature',
    filter: (q) => ranked.reduce((acc, t) => acc.filter('accounting_unit_name', 'imatch', wordPattern(t)), q.not('accounting_unit_name', 'is', null)),
    orderBy: [{ column: 'amount', ascending: false }, { column: 'id' }],
    label: `association unit ${slug}`,
  });
  return raw.filter((r) => r.accounting_unit_name && unitNameToSlug(r.accounting_unit_name) === slug);
});

// The most used spelling of the unit name.
function unitLabel(rows: UnitRow[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const n = (r.accounting_unit_name || '').trim();
    if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';
}

export type PartyUnit = { party: PartyRef; href: string; count: number; total: number };

export type AssociationView =
  | { kind: 'single'; unitName: string; party: PartyRef; rows: UnitRow[] }
  | { kind: 'chooser'; unitName: string; national: boolean; parties: PartyUnit[] };

function byParty(rows: UnitRow[], ref: (recipient: string | null) => PartyRef): Map<string, { party: PartyRef; rows: UnitRow[] }> {
  const out = new Map<string, { party: PartyRef; rows: UnitRow[] }>();
  for (const r of rows) {
    const p = ref(r.recipient_name);
    const g = out.get(p.name) ?? { party: p, rows: [] };
    // Keep a money page link if any spelling of this party has one.
    if (!g.party.moneySlug && p.moneySlug) g.party = p;
    g.rows.push(r);
    out.set(p.name, g);
  }
  return out;
}

// What /donations/constituencies/<slug> shows, or null for a 404.
export const resolveAssociation = cache(async (slug: string): Promise<AssociationView | null> => {
  const ref = await partyRefs();
  const rows = await rowsForUnitSlug(slug);
  if (rows.length > 0) {
    const unitName = unitLabel(rows);
    const parties = byParty(rows, ref);
    const national = isNationalUnit(unitName);
    if (!national && parties.size === 1) {
      const [only] = parties.values();
      return { kind: 'single', unitName, party: only.party, rows };
    }
    const list: PartyUnit[] = [...parties.values()].map(({ party, rows: pr }) => ({
      party,
      href: national ? (party.moneySlug ? `/parties/${party.moneySlug}/money` : '') : `/donations/constituencies/${slug}-${party.slug}`,
      count: pr.length,
      total: pr.reduce((s, r) => s + Number(r.amount || 0), 0),
    })).sort((a, b) => b.total - a.total || a.party.name.localeCompare(b.party.name));
    return { kind: 'chooser', unitName, national, parties: list };
  }
  // <unit slug>-<party slug>: one party's part of a unit name several parties use. Party slugs are at most a few words.
  const words = slug.split('-');
  for (let k = 1; k <= Math.min(6, words.length - 1); k++) {
    const base = words.slice(0, -k).join('-');
    const suffix = words.slice(-k).join('-');
    const baseRows = await rowsForUnitSlug(base);
    if (baseRows.length === 0) continue;
    const parties = byParty(baseRows, ref);
    if (parties.size < 2 || isNationalUnit(unitLabel(baseRows))) continue;
    const match = [...parties.values()].find((g) => g.party.slug === suffix);
    if (match) return { kind: 'single', unitName: unitLabel(match.rows), party: match.party, rows: match.rows };
  }
  return null;
});
