// One bill status for the whole site (UX1a, 9 Nov 2026; the usability audit found a withdrawn bill listed as "still going
// through Parliament" in one place, "Withdrawn" in another and "1st reading" in search). Every reader facing place that
// turns the Bills API flags into a status calls this module and nothing else reads the raw flags (QA1 A1,
// scripts/checks/bill-status-agreement.test.ts, BILL_STATUS_MODULE).
//
// The order: Royal Assent, then withdrawn, then defeated, then fell at the end of its session (the caller knows the
// session; a bill carried into a later session has not fallen), else in progress at its current stage. It reads our
// table's names (is_act, bill_withdrawn, is_defeated, current_stage) or the Bills API's (isAct, billWithdrawn,
// isDefeated, currentStage.description).

export type BillFlags = {
  is_act?: boolean | null; is_defeated?: boolean | null; bill_withdrawn?: string | null; current_stage?: string | null;
  isAct?: boolean | null; isDefeated?: boolean | null; billWithdrawn?: string | null; currentStage?: { description?: string | null } | null;
};
export type BillStatusKind = 'law' | 'withdrawn' | 'defeated' | 'fell' | 'in_progress';
export type BillStatus = { kind: BillStatusKind; label: string; ended: boolean; endedOn: string | null };

const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDay = (iso: string) => { const [y, m, d] = iso.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };

export function stageOf(b: BillFlags): string | null {
  return (b.current_stage ?? b.currentStage?.description ?? null) || null;
}

// sessionEnded: the bill's latest session has ended (the caller knows the sessions); carried: it was carried into a
// later session, so it has not fallen.
export function billStatus(b: BillFlags, opts: { sessionEnded?: boolean; carried?: boolean } = {}): BillStatus {
  const stage = stageOf(b);
  const act = (b.is_act ?? b.isAct) === true || stage === 'Royal Assent';
  const withdrawn = day(b.bill_withdrawn ?? b.billWithdrawn);
  const defeated = (b.is_defeated ?? b.isDefeated) === true;
  if (act) return { kind: 'law', label: 'Became law (Royal Assent)', ended: true, endedOn: null };
  if (withdrawn) return { kind: 'withdrawn', label: `Withdrawn on ${longDay(withdrawn)}`, ended: true, endedOn: withdrawn };
  if (defeated) return { kind: 'defeated', label: 'Defeated', ended: true, endedOn: null };
  if (opts.sessionEnded && !opts.carried) return { kind: 'fell', label: 'Fell at the end of the session', ended: true, endedOn: null };
  return { kind: 'in_progress', label: stage ? `In progress: ${stage}` : 'In progress', ended: false, endedOn: null };
}

export const isLaw = (b: BillFlags) => billStatus(b).kind === 'law';
// Still going through Parliament, as far as the flags show (a caller that knows the session passes sessionEnded).
export const isInProgress = (b: BillFlags, opts?: { sessionEnded?: boolean; carried?: boolean }) => billStatus(b, opts).kind === 'in_progress';

// A stage sitting dated after the bill was withdrawn: it will not happen, so it is shown as "Cancelled" (QA1 A1).
export function sittingCancelled(b: BillFlags, sittingDate: string | null | undefined): boolean {
  const end = billStatus(b).endedOn;
  const d = day(sittingDate);
  return !!end && !!d && d > end;
}
