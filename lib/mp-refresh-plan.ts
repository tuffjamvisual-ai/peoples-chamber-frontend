// The pages and tags a narrow MP refresh sends (F03, ENTRY 134; lib/mp-refresh.ts refreshMpVotes, refreshMpActivity): each
// MP once, whole positive ids only, one /mps/<id> path and one tag each. Pure, so it is tested without Next
// (scripts/checks/mp-refresh-votes.test.ts).
export function mpRefreshPlan(memberIds: Iterable<number>, tagFor: (id: number) => string): { ids: number[]; paths: string[]; tags: string[] } {
  const ids = [...new Set(memberIds)].filter((n) => Number.isInteger(n) && n > 0);
  return { ids, paths: ids.map((id) => `/mps/${id}`), tags: ids.map(tagFor) };
}
