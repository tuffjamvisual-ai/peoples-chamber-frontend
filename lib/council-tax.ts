// Council tax 2026/27 for the council page: the Band D bill and how it splits
// between the council, county, police, fire, combined authority, Greater London
// Authority and parish or community councils, with the council's own rise on the
// previous year. Reads public.council_tax_levels (scripts/migrations/2026-10-18g-council-tax-levels.sql),
// loaded from the government releases for England, Wales and Scotland.

import { supabase } from '@/lib/supabase';

export type CouncilTax = {
  year: string;
  nation: string;
  council_band_d: number;
  council_band_d_prev: number | null;
  asc_band_d: number | null;
  parish_avg_band_d: number | null;
  county_band_d: number | null;
  police_band_d: number | null;
  fire_band_d: number | null;
  ca_band_d: number | null;
  gla_band_d: number | null;
  area_band_d: number | null;
  county_name: string | null;
  police_name: string | null;
  fire_name: string | null;
  ca_name: string | null;
  source_url: string;
};

export async function loadCouncilTax(gssCode: string | null): Promise<CouncilTax | null> {
  if (!gssCode) return null;
  const { data, error } = await supabase
    .from('council_tax_levels')
    .select('*')
    .eq('council_gss_code', gssCode)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();
  // A failed read throws (owner's approval, 21 Oct 2026); no row for this council is still null.
  if (error) throw new Error(`council_tax_levels ${gssCode}: ${error.message}`);
  if (!data) return null;
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    ...(data as CouncilTax),
    council_band_d: Number(data.council_band_d),
    council_band_d_prev: num(data.council_band_d_prev),
    asc_band_d: num(data.asc_band_d),
    parish_avg_band_d: num(data.parish_avg_band_d),
    county_band_d: num(data.county_band_d),
    police_band_d: num(data.police_band_d),
    fire_band_d: num(data.fire_band_d),
    ca_band_d: num(data.ca_band_d),
    gla_band_d: num(data.gla_band_d),
    area_band_d: num(data.area_band_d),
  };
}
