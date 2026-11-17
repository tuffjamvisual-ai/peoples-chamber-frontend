// The APPG card fields (Cowork ENTRY 227), built from appgs and its officers and funders; used by sectionData.ts.

// One APPG as the card showed it from appg_register: the same fields in the same order and the same text layout, built from
// appgs, appg_officers (current officers) and appg_funders (the benefits table of the register).
type Officer = { role: string | null; name_at_time: string | null; party: string | null; removed: boolean | null; id: number }
type Funder = { source: string | null; description: string | null; value_band: string | null; received_date: string | null; registered_date: string | null; benefit_type: string | null; id: number }
const ukDate = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '')
export function appgCard(r: Record<string, any>): Record<string, string | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const officers = ((r.appg_officers ?? []) as Officer[]).filter((o) => !o.removed).sort((a, b) => a.id - b.id)
  const chairs = officers.filter((o) => /^Chair\b/.test(o.role ?? '')).map((o) => o.name_at_time).filter(Boolean)
  const funders = ((r.appg_funders ?? []) as Funder[]).sort((a, b) => a.id - b.id)
  const types = [...new Set(funders.map((f) => f.benefit_type ?? 'Benefits'))]
  return {
    appg_name: r.title,
    category: r.category,
    chair: chairs.join(', ') || r.registered_contact,
    officers: officers.map((o) => `${o.role}: ${o.name_at_time}${o.party ? ` (${o.party})` : ''}`).join('\n') || null,
    funders: funders.length
      ? types.map((t) => [`${t}:`, 'Source | Description | Value £s In bands of £1,500 | Received | Registered',
          ...funders.filter((f) => (f.benefit_type ?? 'Benefits') === t).map((f) => [f.source, f.description, f.value_band, ukDate(f.received_date), ukDate(f.registered_date)].map((x) => x ?? '').join(' | '))].join('\n')).join('\n\n')
      : 'Registrable benefits received by the group:\nNone',
    purpose: r.purpose,
  }
}
