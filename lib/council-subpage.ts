// Shared by /councils/[slug]/schools and /councils/[slug]/sewage (owner's approval, 21 Oct 2026): the council, its
// county (for districts) and its districts (for counties), read the way the council page reads them. A database error
// throws (never a cached 404); a council that does not exist is null.
import { cache } from 'react';
import { supabase } from '@/lib/supabase';

export type SubpageCouncil = { slug: string; name: string; short_name: string | null; type: string | null; gss_code: string | null; parent_slug: string | null; country: string | null };
export type RelatedRef = { slug: string; name: string; gss_code: string | null };

export const getSubpageCouncil = cache(async (slug: string): Promise<{ c: SubpageCouncil; parent: RelatedRef | null; children: RelatedRef[] } | null> => {
  const { data, error } = await supabase.from('councils').select('slug, name, short_name, type, gss_code, parent_slug, country').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`council ${slug}: ${error.message}`);
  if (!data) return null;
  const c = data as SubpageCouncil;
  const [p, k] = await Promise.all([
    c.parent_slug ? supabase.from('councils').select('slug, name, gss_code').eq('slug', c.parent_slug).maybeSingle() : Promise.resolve({ data: null, error: null }),
    c.type === 'county' ? supabase.from('councils').select('slug, name, gss_code').eq('parent_slug', c.slug).order('name') : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error) throw new Error(`council ${slug} parent: ${p.error.message}`);
  if (k.error) throw new Error(`council ${slug} districts: ${k.error.message}`);
  return { c, parent: (p.data as RelatedRef | null) ?? null, children: (k.data || []) as RelatedRef[] };
});
