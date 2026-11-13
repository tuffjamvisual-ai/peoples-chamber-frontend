// The House a bill is in now (T1-A3 (1), owner approved; T1-A1 found bill pages showing the House a bill started in,
// "Commons", beside its current stage, "Committee stage", for a bill at committee stage in the Lords). One helper, next
// to lib/bill-status.ts, for every place that shows a bill's stage.
//
// The Bills API gives the current stage only by name (bill.current_stage, e.g. "Committee stage", which both Houses
// have), so its House is read from the bill's stages (bill.stages, the API's list, each with house and sittings):
//   1. the stages with that name;
//   2. of those, the one whose first sitting is the latest on or before today: the stage the sync itself chose as
//      current (deriveCurrentStage in lib/bill-stages.ts, which takes the freshest stage by its first sitting);
//   3. else the latest of them with any sitting on or before today;
//   4. if none has sat yet, the first after the last stage that has sat (the next one due); otherwise the last of them.
// Checked on 13 Nov 2026 against all 206 bills of session 2026 to 2027: the House chosen is the House of each bill's
// latest stage that has sat in every case (160 Commons, 39 Lords, 6 Royal Assent, 1 with no stage).
// "Unassigned" (a private bill's petition stages) is no House. No stages, or no stage of that name: no House.

type Sitting = { date?: string | null };
type StageItem = { house?: string | null; description?: string | null; sortOrder?: number | null; stageSittings?: Sitting[] | null };
export type BillStages = { current_stage?: string | null; stages?: { items?: StageItem[] | null } | StageItem[] | null; originating_house?: string | null };
export type House = 'Commons' | 'Lords';

const asHouse = (h: string | null | undefined): House | null => (h === 'Commons' || h === 'Lords' ? h : null);
const lastSat = (s: StageItem, today: string) => (s.stageSittings ?? []).map((x) => (x.date ?? '').slice(0, 10)).filter((d) => d && d <= today).sort().pop() ?? null;

export function currentStageHouse(b: BillStages, today: string = new Date().toISOString().slice(0, 10)): House | null {
  const stage = (b.current_stage ?? '').trim().toLowerCase();
  if (!stage) return null;
  const raw = Array.isArray(b.stages) ? b.stages : b.stages?.items ?? [];
  const items = [...raw].sort((a, z) => (a.sortOrder ?? 0) - (z.sortOrder ?? 0));
  const named = items.filter((s) => (s.description ?? '').trim().toLowerCase() === stage);
  if (!named.length) return null;
  const first = (s: StageItem) => ((s.stageSittings ?? [])[0]?.date ?? '').slice(0, 10);
  const byFirst = named.filter((s) => first(s) && first(s) <= today).sort((a, z) => first(z).localeCompare(first(a)));
  if (byFirst.length) return asHouse(byFirst[0].house);
  const sat = named.filter((s) => lastSat(s, today));
  if (sat.length) return asHouse(sat[sat.length - 1].house);
  const lastSatOrder = Math.max(-Infinity, ...items.filter((s) => lastSat(s, today)).map((s) => s.sortOrder ?? 0));
  const next = named.find((s) => (s.sortOrder ?? 0) > lastSatOrder);
  return asHouse((next ?? named[named.length - 1]).house);
}

// "Lords committee stage", "Commons 2nd reading"; a stage that is no House's (Royal Assent) or whose House is not known
// is shown as it is.
export function stageWithHouse(b: BillStages, today?: string): string | null {
  const stage = (b.current_stage ?? '').trim();
  if (!stage) return null;
  if (/^royal assent$/i.test(stage)) return stage;
  const house = currentStageHouse(b, today);
  return house ? `${house} ${stage.charAt(0).toLowerCase()}${stage.slice(1)}` : stage;
}

// "Started in the Commons" / "Started in the Lords", from the House the bill was introduced in.
export function startedIn(b: BillStages): string | null {
  const h = asHouse(b.originating_house);
  return h ? `Started in the ${h}` : null;
}
