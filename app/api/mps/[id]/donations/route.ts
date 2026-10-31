import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminRead as supabase } from '@/lib/supabase-admin';
import { SECTORS, sectorForDonor, sectorForVote, ALL_VOTE_KEYWORDS } from '@/lib/donor-sectors';
import { readAll, inList } from '@/lib/read-all';
import { storedSpellings } from '@/lib/donor-registry';
import { recipientIsMp, stripHonorific } from '@/lib/mp-recipient-match';

// Cached like the MP page (25 Oct 2026, report 43): the profile now fetches this as soon as the page is idle, so the
// Donations tab opens at once, and the answer is kept for 6 hours (revalidate below) instead of being worked out for
// every visitor (about 0.8 s warm, 4 s cold). A failed read throws, so a database error is never cached as an empty
// list: the last good answer stays up. The params are read; search params are not used.
export const dynamic = 'force-static';
export const revalidate = 21600;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const { data: mp, error: mpErr } = await supabase
    .from('mps')
    .select('display_name, name, constituency')
    .eq('member_id', memberId)
    .single();
  if (mpErr && mpErr.code !== 'PGRST116') throw new Error(`/api/mps/${memberId}/donations mps: ${mpErr.message}`);
  if (!mp) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const mpNameTop = (mp.display_name as string | null) || (mp.name as string | null) || '';
  const mpNameKey = stripHonorific(mpNameTop);
  const firstWord = mpNameKey.split(/\s+/)[0]?.toLowerCase() ?? '';
  const lastWord = mpNameKey.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '';
  const constituency = (mp.constituency as string | null) || '';

  if (firstWord.length < 2 || lastWord.length < 2) {
    return NextResponse.json({ donations: [], donorOtherRecipients: [], sectorCrossRef: [], constituencyDonations: [] });
  }

  // 1. Direct donations. ec_ref (24 Oct 2026): each record's "EC reference" row links to the Electoral Commission's
  // search; the profile already drew that link but the reference was never read, so it never showed.
  const { data: rawDonations, error: rawErr } = await supabase
    .from('political_donations')
    .select('id, donor_name, donor_type, amount, accepted_date, received_date, reported_date, nature, recipient_name, recipient_type, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, company_registration_number, trust_name, trust_creator_name, ec_ref')
    .in('recipient_type', ['MP - Member of Parliament', 'Regulated Donee', 'Members Association', 'Member of Registered Political Party'])
    .ilike('recipient_name', `%${firstWord}%`)
    .ilike('recipient_name', `%${lastWord}%`)
    .order('accepted_date', { ascending: false })
    .limit(500);
  if (rawErr) throw new Error(`/api/mps/${memberId}/donations direct: ${rawErr.message}`);

  type RawDonation = { id: number; recipient_name?: string | null; donor_name?: string | null; [key: string]: unknown };

  // One test for "is this recipient the MP?", used by step 1 (which donations are the MP's) and step 2 (keeping the MP
  // out of "Also funds"), so the two can never disagree (owner, 31 Oct 2026: Ed Davey's donors showed "Also funds:
  // Mr Edward Davey MP" because step 2 used a plain substring test on "ed davey").
  const isThisMp = (recipientName: string | null | undefined) => recipientIsMp(recipientName, firstWord, lastWord);

  const donations = ((rawDonations || []) as RawDonation[]).filter((d) => isThisMp(d.recipient_name));
  // Every recipient_name string among the MP's own donations, trimmed: also never shown as another recipient.
  const ownRecipientNames = new Set(donations.map((d) => String(d.recipient_name || '').trim()).filter(Boolean));

  // 2. Donor other recipients
  const donorNames = Array.from(new Set(
    donations.map((d) => (d.donor_name as string || '').trim()).filter((n) => n.length > 0),
  )) as string[];

  const donorOtherRecipients: Array<{ donor_name: string; recipients: Array<{ recipient: string; total: number }> }> = [];
  if (donorNames.length > 0) {
    // Every row for these donors (24 Oct 2026, report 36): a single read stopped at 1,000 rows, in no order, so for
    // MPs whose donors give often (15 MPs today) the other recipients and totals were an arbitrary part of the record.
    // Every stored spelling of each name, quoted, so names saved with leading or trailing spaces match too (report 37).
    const spellings = await storedSpellings(donorNames.slice(0, 60));
    const otherRows = await readAll<{ donor_name: string | null; recipient_name: string | null; amount: number | string | null }>(
      () => supabase.from('political_donations'),
      {
        columns: 'id, donor_name, recipient_name, amount',
        filter: (q) => q.filter('donor_name', 'in', inList(spellings)).not('recipient_name', 'is', null),
        orderBy: 'id',
        label: `/api/mps/${memberId}/donations other recipients`,
      },
    );
    {
      const agg = new Map<string, Map<string, number>>();
      for (const r of otherRows as Array<{ donor_name: string | null; recipient_name: string | null; amount: number | string | null }>) {
        const dn = (r.donor_name || '').trim();
        const rn = (r.recipient_name || '').trim();
        if (!dn || !rn) continue;
        if (isThisMp(rn) || ownRecipientNames.has(rn)) continue;
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
    const { data: rawVotes, error: votesErr } = await supabase
      .from('mp_division_votes')
      .select('id, division_title, division_date, division_date_only, division_number, vote_type, is_rebellion, division_id')
      .eq('member_id', memberId)
      .or(orClause)
      .in('vote_type', ['aye', 'no', 'both'])
      .order('division_date', { ascending: false })
      .limit(500);
    if (votesErr) throw new Error(`/api/mps/${memberId}/donations votes: ${votesErr.message}`);

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
    const { data: localRows, error: localErr } = await supabase
      .from('political_donations')
      .select('id, donor_name, donor_type, amount, accepted_date, received_date, reported_date, nature, recipient_type, accounting_unit_name, is_reported_pre_poll, returned_date, impermissibility_reason, attempted_concealment, trust_name, trust_creator_name, company_registration_number')
      .or(orParts.join(','))
      .order('accepted_date', { ascending: false })
      .limit(500);
    if (localErr) throw new Error(`/api/mps/${memberId}/donations constituency: ${localErr.message}`);

    const conTokens = constituency.toLowerCase().replace(/&/g, 'and').split(/\s+/).filter((w) => w.length > 2 && !['and','the','of','for','upon','on','le'].includes(w));
    constituencyDonations = ((localRows ?? []) as Array<{ accounting_unit_name?: string | null }>).filter((r) => {
      const aun = String(r.accounting_unit_name || '').toLowerCase().replace(/&/g, 'and');
      return conTokens.every((t) => aun.includes(t));
    });
  }

  return NextResponse.json({ donations, donorOtherRecipients, sectorCrossRef, constituencyDonations });
}
