// Donor backgrounds (owner's approval, 31 Oct 2026): "Who they are" on /donors/<slug>, from public records and
// published reporting, each fact with its source. Stored in public.donor_profiles (one row per donor, facts as a JSON
// array) and public.donor_profile_slugs (every donor page slug that profile covers), migration 2026-10-31k. The text is
// stored and shown exactly as written; the 16 Oct rule (no en or em dashes) is checked here.
import { cache } from 'react';

export const LABEL_ORDER = [
  'Who they are', 'Business', 'Ownership and control', 'Size', 'Represents', 'Political fund',
  'Wealth (as reported)', 'Public roles', 'Honours', 'Sector interests', 'Official findings',
] as const;
export type FactLabel = (typeof LABEL_ORDER)[number];

export const KINDS = ['individual', 'company', 'union', 'society', 'trust', 'other'] as const;
export type DonorKind = (typeof KINDS)[number];

export type DonorFact = { label: FactLabel; text: string; source: { title: string; url: string } };
export type DonorProfile = { key: string; name: string; kind: DonorKind; facts: DonorFact[]; last_checked: string };

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DASH_RE = /[–—]/;

// Problems with a profile, one message each; an empty list means it is valid.
export function validate(p: unknown): string[] {
  const problems: string[] = [];
  if (!p || typeof p !== 'object') return ['profile is not an object'];
  const d = p as Record<string, unknown>;
  const key = typeof d.key === 'string' ? d.key : '';
  const at = key || '(no key)';
  if (!KEY_RE.test(key)) problems.push(`${at}: key must be lower case letters, digits and single hyphens`);
  if (typeof d.name !== 'string' || !d.name.trim()) problems.push(`${at}: name is empty`);
  if (!KINDS.includes(d.kind as DonorKind)) problems.push(`${at}: kind must be one of ${KINDS.join(', ')}`);
  const facts = Array.isArray(d.facts) ? d.facts : null;
  if (!facts) { problems.push(`${at}: facts is not an array`); return problems; }
  if (facts.length < 1 || facts.length > 12) problems.push(`${at}: ${facts.length} facts (1 to 12 allowed)`);
  facts.forEach((f, i) => {
    const fact = (f ?? {}) as Record<string, unknown>;
    const src = (fact.source ?? {}) as Record<string, unknown>;
    const where = `${at} fact ${i + 1}`;
    if (!LABEL_ORDER.includes(fact.label as FactLabel)) problems.push(`${where}: label "${String(fact.label)}" is not one of the labels`);
    if (typeof fact.text !== 'string' || !fact.text.trim()) problems.push(`${where}: text is empty`);
    else if (DASH_RE.test(fact.text)) problems.push(`${where}: text contains an en or em dash`);
    if (typeof src.title !== 'string' || !src.title.trim()) problems.push(`${where}: source title is empty`);
    if (typeof src.url !== 'string' || !src.url.startsWith('https://')) problems.push(`${where}: source url must start with https://`);
  });
  return problems;
}

// Facts in LABEL_ORDER (a stable sort, so facts under one label keep their order).
export function sortFacts(facts: DonorFact[]): DonorFact[] {
  return [...facts].sort((a, b) => LABEL_ORDER.indexOf(a.label) - LABEL_ORDER.indexOf(b.label));
}

// The profile for a donor page, with the other slugs it covers. On any error it logs and returns null, so the donor
// page still renders without the section; it never throws.
export const getDonorProfile = cache(async (slug: string): Promise<{ profile: DonorProfile; otherSlugs: string[] } | null> => {
  try {
    // Loaded here, not at the top, so scripts/checks/donor-profile-check.ts can import validate() outside Next.
    const { supabase } = await import('@/lib/supabase');
    const { data: link, error: linkErr } = await supabase.from('donor_profile_slugs').select('key').eq('slug', slug).maybeSingle();
    if (linkErr) throw new Error(`donor_profile_slugs ${slug}: ${linkErr.message}`);
    if (!link) return null;
    const key = (link as { key: string }).key;
    const [prof, slugs] = await Promise.all([
      supabase.from('donor_profiles').select('key, name, kind, facts, last_checked').eq('key', key).maybeSingle(),
      supabase.from('donor_profile_slugs').select('slug').eq('key', key).order('slug'),
    ]);
    if (prof.error) throw new Error(`donor_profiles ${key}: ${prof.error.message}`);
    if (slugs.error) throw new Error(`donor_profile_slugs for ${key}: ${slugs.error.message}`);
    if (!prof.data) return null;
    const profile = prof.data as DonorProfile;
    return {
      profile: { ...profile, facts: sortFacts(Array.isArray(profile.facts) ? profile.facts : []) },
      otherSlugs: ((slugs.data ?? []) as { slug: string }[]).map((s) => s.slug).filter((s) => s !== slug),
    };
  } catch (e) {
    console.error('[donor-profile]', e instanceof Error ? e.message : e);
    return null;
  }
});
