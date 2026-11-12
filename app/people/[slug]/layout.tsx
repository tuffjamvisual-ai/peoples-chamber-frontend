import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { metaDescription } from '@/lib/meta-description'
import { fitTitle } from '@/lib/seo-title'
import { bareName, resolvePersonName, sameLetters } from '@/lib/person-name'

type FirstRole = { title?: string | null; organisation?: string | null }

// The page answers 404 for this address and shows the site's 'Page not found'; a layout cannot call notFound() for its
// metadata without losing the title, so it gives the not-found page's own title and robots (app/not-found.tsx).
const NOT_FOUND: Metadata = { title: 'Page not found', robots: { index: false, follow: false } };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const niceName = slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
  // Description (owner's approval, 23 Oct 2026): the person's first current role from person_cache, as the page
  // shows it. Without one the description stays as it was. Job titles and organisations are kept exactly as
  // written; "at <organisation>" is left out when the title already names it.
  const { data, error } = await supabase.from('person_cache').select('name, current_roles').eq('slug', slug).maybeSingle()
  if (error && error.code !== 'PGRST116') throw new Error(`/people/[slug] metadata: ${error.message}`)
  // No person_cache row and no minister row means no person page (the page's own rule): a real 404, noindex and
  // 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026), not a title made from the address.
  if (!data) {
    const { data: minister, error: ministerErr } = await supabase.from('dept_ministers').select('slug').eq('slug', slug).limit(1).maybeSingle()
    if (ministerErr && ministerErr.code !== 'PGRST116') throw new Error(`/people/[slug] metadata ministers: ${ministerErr.message}`)
    if (!minister) return NOT_FOUND
  }
  const stored = (data?.name as string | null)?.replace(/\s+/g, ' ').trim()
  const name = stored ? (await resolvePersonName(stored)).name : niceName
  // The address has no punctuation: the person's own spelling keeps a hyphen or apostrophe it cannot show (owner, 5 Nov 2026).
  const plainName = stored && sameLetters(stored, niceName) ? bareName(name) : niceName
  const role = ((data?.current_roles as FirstRole[] | null) || [])[0]
  const roleTitle = role?.title?.replace(/\s+/g, ' ').trim()
  const org = role?.organisation?.replace(/\s+/g, ' ').trim()
  const description = roleTitle
    ? metaDescription(`${name}, ${roleTitle}${org && !roleTitle.toLowerCase().includes(org.toLowerCase()) ? ` at ${org}` : ''}: current roles, declared interests and career.`)
    : `${plainName}, current roles, financial interests and political career on opengovt.`
  // Title (owner's approval, 24 Oct 2026): the name with the first current role, or with its organisation, within 60
  // characters with the suffix (lib/seo-title.ts); otherwise the name alone, as before.
  const title = roleTitle
    ? fitTitle(`${name}, ${roleTitle}`, ...(org ? [`${name}, ${org}`] : []), plainName)
    : plainName
  return {
    title,
    description,
    alternates: { canonical: `/people/${slug}` },
  }
}

export default function PersonLayout({ children }: { children: React.ReactNode }) {
  return children
}
