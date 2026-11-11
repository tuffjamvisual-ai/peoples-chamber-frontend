// T1-AUD3 (1), owner 11 Nov 2026 (accuracy first): what a contract change notice actually is. Find a Tender's change
// notice form (UK10) is also used for things that change nothing: an addendum attaching the redacted contract (the NESO
// £17,700,270 award, 27 Oct 2026: "This notice does not describe a modification of the contract. Instead this notice is
// being used as an addendum"), or a correction. Such a notice is shown as its own kind, never as "changed to £…"; a value
// change is shown only when the notice is a modification that states a new value different from the one before.
export type ChangeKind = { kind: 'value_change' | 'addendum' | 'correction' | 'unchanged'; label: string };

const NOT_A_MODIFICATION = /does not (describe|constitute|represent) a (modification|change)|not a (modification|change) (of|to) the contract|\baddendum\b/i;
const DOCUMENT = /(copy of|attach\w*|upload\w*|publish\w*)[^.]{0,80}\bcontract\b|\bcontract (document|copy)/i;
const CORRECTION = /\b(correct(ion|ing|s)?|typo|typographical|error in the (notice|previous notice)|amend(ed|ing)? (an )?error)\b/i;

export function changeKind(text: string | null, newValue: number | null, previousValue: number | null): ChangeKind {
  const t = text ?? '';
  if (NOT_A_MODIFICATION.test(t)) return { kind: 'addendum', label: DOCUMENT.test(t) ? 'Addendum: contract document attached' : 'Addendum' };
  if (CORRECTION.test(t) && (newValue == null || previousValue == null || newValue === previousValue)) return { kind: 'correction', label: 'Correction notice' };
  if (newValue != null && previousValue != null && newValue === previousValue) return { kind: 'unchanged', label: 'Change notice, value unchanged' };
  return { kind: 'value_change', label: 'Change notice' };
}
