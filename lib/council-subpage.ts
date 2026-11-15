// Shared by /councils/[slug]/schools and /councils/[slug]/sewage (owner's approval, 21 Oct 2026): the council, its
// county (for districts) and its districts (for counties), read the way the council page reads them. A database error
// throws (never a cached 404); a council that does not exist is null.
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';

export type SubpageCouncil = { slug: string; name: string; short_name: string | null; type: string | null; gss_code: string | null; parent_slug: string | null; country: string | null };
export type RelatedRef = { slug: string; name: string; gss_code: string | null };

export const getSubpageCouncil = cache(async (slug: string): Promise<{ c: SubpageCouncil; parent: RelatedRef | null; children: RelatedRef[] } | null> => {
  const { data, error } = await cachedQuery(['q:lib/council-subpage.ts:4025dbaa5c', JSON.stringify([slug])], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('slug, name, short_name, type, gss_code, parent_slug, country').eq('slug', slug).maybeSingle());
  if (error) throw new Error(`council ${slug}: ${error.message}`);
  if (!data) return null;
  const c = data as SubpageCouncil;
  const [p, k] = await Promise.all([
    c.parent_slug ? cachedQuery(['q:lib/council-subpage.ts:edf9f06b9a', JSON.stringify([c.parent_slug])], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('slug, name, gss_code').eq('slug', c.parent_slug).maybeSingle()) : Promise.resolve({ data: null, error: null }),
    c.type === 'county' ? cachedQuery(['q:lib/council-subpage.ts:d23617a5cf', JSON.stringify([c.slug])], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('slug, name, gss_code').eq('parent_slug', c.slug).order('name')) : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error) throw new Error(`council ${slug} parent: ${p.error.message}`);
  if (k.error) throw new Error(`council ${slug} districts: ${k.error.message}`);
  return { c, parent: (p.data as RelatedRef | null) ?? null, children: (k.data || []) as RelatedRef[] };
});
