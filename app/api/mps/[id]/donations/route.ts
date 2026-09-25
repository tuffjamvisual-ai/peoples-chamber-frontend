import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { SECTORS, sectorForDonor, sectorForVote, ALL_VOTE_KEYWORDS } from '@/lib/donor-sectors';

export const dynamic = 'force-dynamic';

function stripHonorific(name: string): string {
  return name
    .replace(/^(?:Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr|The )\s+/i, '')
    .replace(/\s+(?:MP|QC|KC|CBE|OBE|MBE)\s*$/i, '')
    .trim();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const { data: mp } = await supabase
    .from('mps')
    .select('display_name, name, constituency')
    .eq('member_id', memberId)
    .single();
  if (!mp) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const mpNameTop = (mp.display_name as string | null) || (mp.name as string | null) || '';
  const mpNameKey = stripHonorific(mpNameTop);
  const firstWord = mpNameKey.split(/\s+/)[0]?.toLowerCase() ?? '';
  const lastWord = mpNameKey.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';
  const constituency = (mp.constituency as string | null) || '';

  if (firstWord.length < 2 || lastWord.length < 2) {
    return NextResponse.json({ donations: [], donorOtherRecipients: [], sectorCrossRef: [], constituencyDonations: [] });
  }

  // 1. Direct donations
  const { data: rawDonations } = await supabase
    .from('political_donations')
    .select('id, donor_name, donor_type, amount, accepted_date, received_date, reported_date, nature, recipient_name, recipient_type, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, company_registration_number, trust_name, trust_creator_name')
    .in('recipient_type', ['MP - Member of Parliament', 'Regulated Donee', 'Members Association', 'Member of Registered Political Party'])
    .ilike('recipient_name', `%${firstWord}%`)
    .ilike('recipient_name', `%${lastWord}%`)
    .order('accepted_date', { ascending: false })
    .limit(500);

  type RawDonation = { id: number; recipient_name?: string | null; donor_name?: string | null; [key: string]: unknown };

  const donations = ((rawDonations || []) as RawDonation[]).filter((d) => {
    const rn = String(d.recipient_name || '').toLowerCase();
    const tokens = rn.split(/[\s,.\-]+/).filter(Boolean);
    if (!tokens.includes(lastWord)) return false;
    if (firstWord.length < 2) return false;
    return tokens.some((t) => t === firstWord || t.startsWith(firstWord));
  });

  // 2. Donor other recipients
  const donorNames = Array.from(new Set(
    donations.map((d) => (d.donor_name as string || '').trim()).filter((n) => n.length > 0),
  )) as string[];

  const donorOtherRecipients: Array<{ donor_name: string; recipients: Array<{ recipient: string; total: number }> }> = [];
  if (donorNames.length > 0) {
    const { data: otherRows } = await supabase
      .from('political_donations')
      .select('donor_name, recipient_name, amount')
      .in('donor_name', donorNames.slice(0, 60))
      .not('recipient_name', 'is', null)
      .limit(5000);
    if (otherRows) {
      const agg = new Map<string, Map<string, number>>();
      for (const r of otherRows as Array<{ donor_name: string | null; recipient_name: string | null; amount: number | string | null }>) {
        const dn = (r.donor_name || '').trim();
        const rn = (r.recipient_name || '').trim();
        if (!dn || !rn) continue;
        if (rn.toLowerCase().includes(mpNameKey.toLowerCase())) continue;
        if (!agg.has(dn)) agg.set(dn, new Map());
        const inner = agg.get(dn)!;
        inner.set(rn, (inner.get(rn) ?? 0) + (Number(r.amount) || 0));
      }
      for (const [dn, inner] of agg.entries()) {
        const sorted = Array.from(inner.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        donorOtherRecipients.push({ donor_name: dn, recipients: sorted.map(([recipient, total]) => ({ recipient, total })) });
      }
    }
  }

  // 3. Sector cross-reference
  const donorSectorKeys = new Set<string>();
  for (const d of donations) {
    const s = sectorForDonor((d.donor_name as string) || '');
    if (s) donorSectorKeys.add(s.key);
  }

  let sectorCrossRef: Array<{ key: string; label: string; colour: string; votes: unknown[] }> = [];
  if (donorSectorKeys.size > 0) {
    const orClause = ALL_VOTE_KEYWORDS.map((kw) => `division_title.ilike.%${kw.replace(/[%_,]/g, '')}%`).join(',');
    const { data: rawVotes } = await supabase
      .from('mp_division_votes')
      .select('id, division_title, division_date, division_date_only, division_number, vote_type, is_rebellion, division_id')
      .eq('member_id', memberId)
      .or(orClause)
      .in('vote_type', ['aye', 'no', 'both'])
      .order('division_date', { ascending: false })
      .limit(500);

    const sectorVotesByKey: Record<string, unknown[]> = {};
    for (const v of (rawVotes ?? []) as Array<{ division_title: string | null }>) {
      const s = sectorForVote(v.division_title);
      if (!s) continue;
      if (!donorSectorKeys.has(s.key)) continue;
      if (!sectorVotesByKey[s.key]) sectorVotesByKey[s.key] = [];
      sectorVotesByKey[s.key].push(v);
    }

    sectorCrossRef = SECTORS
      .filter((s) => donorSectorKeys.has(s.key) && (sectorVotesByKey[s.key]?.length ?? 0) > 0)
      .map((s) => ({
        key: s.key,
        label: s.label,
        colour: s.colour,
        votes: sectorVotesByKey[s.key] ?? [],
      }));
  }

  // 4. Constituency donations
  let constituencyDonations: unknown[] = [];
  if (constituency.length > 2) {
    const constAnd = constituency.replace(/&/g, 'and').trim();
    const constAmp = constituency.replace(/\band\b/g, '&').trim();
    const orParts: string[] = [];
    const variants = Array.from(new Set([constituency, constAnd, constAmp].filter((s) => s.length > 2)));
    for (const v of variants) {
      const safe = v.replace(/[%_,]/g, '');
      orParts.push(`accounting_unit_name.ilike.%${safe}%`);
    }
    const { data: localRows } = await supabase
      .from('political_donations')
      .select('id, donor_name, donor_type, amount, accepted_date, received_date, reported_date, nature, recipient_type, accounting_unit_name, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, trust_name, trust_creator_name, company_registration_number')
      .or(orParts.join(','))
      .order('accepted_date', { ascending: false })
      .limit(500);

    const conTokens = constituency.toLowerCase().replace(/&/g, 'and').split(/\s+/).filter((w) => w.length > 2 && !['and','the','of','for','upon','on','le'].includes(w));
    constituencyDonations = ((localRows ?? []) as Array<{ accounting_unit_name?: string | null }>).filter((r) => {
      const aun = String(r.accounting_unit_name || '').toLowerCase().replace(/&/g, 'and');
      return conTokens.every((t) => aun.includes(t));
    });
  }

  return NextResponse.json({ donations, donorOtherRecipients, sectorCrossRef, constituencyDonations });
}
