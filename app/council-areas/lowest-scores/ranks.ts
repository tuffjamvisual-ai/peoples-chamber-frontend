// Plain ranks for /council-areas/lowest-scores and its area pages (Cowork ENTRY 436 point 3): '4th worst of 294',
// 'best of 294', 'joint 28th worst of 294'. No data import, so the postcode box (a client component) can use it without
// pulling the page data into the browser.

export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// rank: 1 is the worst figure; tie: how many areas share that rank (they all hold the lowest rank of the group).
// Ranks in the worse half count from the worst end, the rest from the best end: a tied group at the best end counts from
// its best place, so areas sharing the best figure are each 'joint best of 294'.
export function plainRank(rank: number, of: number, worst = 'worst', best = 'best', tie = 1): string {
  const joint = tie > 1 ? 'joint ' : '';
  if (rank <= of / 2) return `${joint}${rank === 1 ? '' : `${ordinal(rank)} `}${worst} of ${of}`;
  const fromBest = of + 2 - rank - tie;
  return `${joint}${fromBest === 1 ? '' : `${ordinal(fromBest)} `}${best} of ${of}`;
}

// The overall rank: 1 is the lowest score.
export const plainScoreRank = (rank: number, of: number) => plainRank(rank, of, 'lowest', 'highest');
