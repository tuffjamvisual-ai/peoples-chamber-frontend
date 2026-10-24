import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { metaDescription } from '@/lib/meta-description'
import { fitTitle } from '@/lib/seo-title'

type FirstRole = { title?: string | null; organisation?: string | null }

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
  const name = (data?.name as string | null)?.replace(/\s+/g, ' ').trim() || niceName
  const role = ((data?.current_roles as FirstRole[] | null) || [])[0]
  const roleTitle = role?.title?.replace(/\s+/g, ' ').trim()
  const org = role?.organisation?.replace(/\s+/g, ' ').trim()
  const description = roleTitle
    ? metaDescription(`${name}, ${roleTitle}${org && !roleTitle.toLowerCase().includes(org.toLowerCase()) ? ` at ${org}` : ''}: current roles, declared interests and career.`)
    : `${niceName}, current roles, financial interests and political career on opengovt.`
  // Title (owner's approval, 24 Oct 2026): the name with the first current role, or with its organisation, within 60
  // characters with the suffix (lib/seo-title.ts); otherwise the name alone, as before.
  const title = roleTitle
    ? fitTitle(`${name}, ${roleTitle}`, ...(org ? [`${name}, ${org}`] : []), niceName)
    : niceName
  return {
    title,
    description,
    alternates: { canonical: `/people/${slug}` },
  }
}

export default function PersonLayout({ children }: { children: React.ReactNode }) {
  return children
}
