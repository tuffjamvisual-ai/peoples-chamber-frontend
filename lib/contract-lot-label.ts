// How a contract page names a lot (T1-LOT, 12 Nov 2026): "Lot 2: South" from the lot's id and its title as published;
// several lots "Lots 1, 2, 3 and 6", or "All 8 lots"; nothing on a procurement with one lot or none (the label would say nothing).
export type LotTitle = { lot_id: string; title: string | null };

const bare = (id: string) => id.replace(/^lot\s*/i, '').trim() || id;

export function lotLabel(ids: string[] | null | undefined, lots: LotTitle[]): string | null {
  if (!ids?.length) return null;
  if (ids.length > 1) {
    if (lots.length > 1 && lots.every((l) => ids.includes(l.lot_id))) return `All ${lots.length} lots`;
    const names = ids.map(bare);
    return `Lots ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  const id = ids[0];
  const title = lots.find((l) => l.lot_id === id)?.title?.trim();
  const head = `Lot ${bare(id)}`;
  if (!title) return head;
  // Titles often repeat the number ("Lot 2 - South", "Lot 2: South"); say it once.
  const rest = title.replace(new RegExp(`^lot\\s*${bare(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\s*[:\\-–—.]?\\s*`, 'i'), '').trim();
  return rest ? `${head}: ${rest}` : head;
}

// A procurement shows lot labels only when it has more than one lot: in its published lots, or named by its notices.
export function hasSeveralLots(lots: LotTitle[], noticeLots: (string[] | null | undefined)[]): boolean {
  const ids = new Set<string>([...lots.map((l) => l.lot_id), ...noticeLots.flatMap((x) => x ?? [])]);
  return ids.size > 1;
}

// A contract title that already starts with its one lot ("Lot 4 - 27 Shared beds") needs no separate lot line.
export function namesLot(title: string | null | undefined, ids: string[] | null | undefined): boolean {
  if (!title || ids?.length !== 1) return false;
  const id = bare(ids[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*lot\\s*${id}\\b`, 'i').test(title);
}
