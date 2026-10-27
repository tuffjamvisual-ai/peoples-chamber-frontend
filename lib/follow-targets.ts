// What a follow points at (job 74): the page's name for the follows list, and the state the weekly digest compares
// against later (lib/member-digest.ts). Read from the same tables as the pages, so a member can only follow a page that
// exists.
//   mp     key: member id         label: the MP's display name
//   bill   key: bill id           label: the bill title      state: the stage the member was last told about
//   donor  key: donor page slug   label: the donor's name    state: every spelling of the name on the register
import { supabaseAdmin } from '@/lib/supabase-admin';
import { donorRegistry } from '@/lib/donor-registry';
import type { FollowKind } from '@/lib/member-data';

export type FollowTarget = { label: string; state: Record<string, unknown>; href: string };

export function followHref(kind: FollowKind, key: string): string {
  return kind === 'mp' ? `/mps/${key}` : kind === 'bill' ? `/bills/${key}` : `/donors/${key}`;
}

export async function resolveFollowTarget(kind: FollowKind, key: string): Promise<FollowTarget | null> {
  if (kind === 'mp') {
    if (!/^\d{1,7}$/.test(key)) return null;
    const { data, error } = await supabaseAdmin.from('mps').select('display_name, name').eq('member_id', Number(key)).maybeSingle();
    if (error) throw new Error(`mps: ${error.message}`);
    if (!data) return null;
    return { label: String(data.display_name || data.name || key).replace(/\s+MP$/, ''), state: {}, href: followHref(kind, key) };
  }
  if (kind === 'bill') {
    if (!/^\d{1,7}$/.test(key)) return null;
    const { data, error } = await supabaseAdmin.from('bill').select('title, current_stage, stage_date, hidden_reason').eq('id', Number(key)).maybeSingle();
    if (error) throw new Error(`bill: ${error.message}`);
    if (!data || data.hidden_reason) return null;
    return { label: String(data.title), state: { stage: data.current_stage ?? null, stageDate: data.stage_date ?? null }, href: followHref(kind, key) };
  }
  if (!/^[a-z0-9-]{1,120}$/.test(key)) return null;
  const entry = (await donorRegistry()).bySlug.get(key);
  if (!entry) return null;
  return { label: entry.label, state: { names: [...new Set(entry.names.flatMap((n) => [n, n.trim()]))] }, href: followHref(kind, key) };
}
