// What councils.revenue_budget_mn is, by nation (Cowork ENTRY 755 item 3 (a); T2-718 point (a)). The column holds a different
// measure in each nation, written by scripts/backfill-council-budget-mhclg.js (England) and
// scripts/backfill-council-finance-wales-scotland.js (Wales, Scotland); Northern Ireland has none. The page named all of them
// 'Annual revenue budget' with no year, and the spending note called England's a 'budgeted resource requirement'.
export type BudgetLabel = { label: string; year: string; sub: string; measure: string };

export const BUDGET_LABEL_BY_NATION: Record<string, BudgetLabel> = {
  England: {
    label: 'Net current expenditure 2024/25',
    year: '2024/25',
    measure: 'planned net current expenditure for 2024/25',
    sub: 'From the council’s revenue account budget return to the government (MHCLG RA 2024/25): its planned day to day spending after income from fees, charges and specific grants.',
  },
  Wales: {
    label: 'Standard spending assessment 2026/27',
    year: '2026/27',
    measure: 'Welsh Government assessment of spending need for 2026/27',
    sub: 'The Welsh Government’s assessment of what the council needs to spend (final local government settlement 2026/27), not the council’s own budget.',
  },
  Scotland: {
    label: 'Net revenue expenditure 2026/27 (budget)',
    year: '2026/27',
    measure: 'budgeted net revenue expenditure for 2026/27',
    sub: 'From the Scottish Government’s budget estimates for 2026/27: net spending on services plus financing costs.',
  },
};

/** The note under the service spending total, where the council also has a figure above. */
export function spendingDiffersNote(country: string, period: string | null): string | null {
  const b = BUDGET_LABEL_BY_NATION[country];
  if (!b) return null;
  return `This is what the council spent on each service${period ? ` in ${period}` : ''}, after the income each service raised. It differs from the ${b.measure} above, a different measure for a different year. A service shows a negative figure when its income, such as fees, rents or grants, was larger than its spending.`;
}
