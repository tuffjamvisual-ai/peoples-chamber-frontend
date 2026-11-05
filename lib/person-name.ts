// People's names (owner, 5 Nov 2026). GOV.UK's record can carry a typing slip ("Nick Thomas–Symonds", en dash), so a
// person's name is not official text in the way an organisation's is: Parliament's Members API spelling is used where
// the person is matched to a sitting MP, and otherwise a dash with no space either side, between two letters, is a hyphen.
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { hyphenatePersonName } from '@/lib/no-em-dash';

const HONORIFIC = /^(the\s+)?(rt\.?\s+hon\.?\s+|right honourable\s+)?(sir\s+|dame\s+|dr\.?\s+|mr\.?\s+|mrs\.?\s+|ms\.?\s+)*/i;
const POST_NOMINALS = /(\s+(kc|mp|cbe|obe|mbe))+$/i;

// The name without titles and post-nominals, as printed.
export const bareName = (name: string) => name.trim().replace(HONORIFIC, '').replace(POST_NOMINALS, '').trim();
// Letters and spaces only, so "Thomas-Symonds", "Thomas–Symonds" and "Thomassymonds" are the same person.
export const personNameKey = (name: string) => bareName(name).toLowerCase().replace(/[^a-z ]/g, '').trim();
// The same letters whatever the spaces: "Thomas-Symonds" and the address's "Thomas Symonds".
export const sameLetters = (a: string, b: string) => personNameKey(a).replace(/ /g, '') === personNameKey(b).replace(/ /g, '');

// The GOV.UK name with its titles kept and the name itself as Parliament spells it. A sitting MP is matched by the name
// without punctuation; the database is searched on the last piece of the surname ("Symonds", "Neill"), as words joined
// by a hyphen or apostrophe would not be found whole.
export const resolvePersonName = cache(async (raw: string): Promise<{ name: string; isMp: boolean }> => {
  const name = hyphenatePersonName(raw);
  const target = personNameKey(name);
  const last = bareName(name).toLowerCase().split(/[^a-z]+/).filter(Boolean).pop();
  if (!target || !last) return { name, isMp: false };
  const { data, error } = await supabase.from('mps').select('name, display_name').eq('current_member', true).ilike('name', `%${last}%`).limit(50);
  if (error && error.code !== 'PGRST116') throw new Error(`person name ${last}: ${error.message}`);
  const mp = ((data ?? []) as { name: string | null; display_name: string | null }[])
    .find((m) => personNameKey(m.name || '') === target || personNameKey(m.display_name || '') === target);
  if (!mp) return { name, isMp: false };
  const parliament = bareName(mp.display_name || mp.name || '');
  const own = bareName(name);
  return { name: parliament && own ? name.replace(own, parliament) : name, isMp: true };
});
