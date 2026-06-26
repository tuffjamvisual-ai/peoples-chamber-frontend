// /budget-trade-offs — Cross-departmental analysis. Pulls the eight
// institutional performance reports' Trade-off Analyses into one
// landscape document: what each dept needs vs what's realistically
// available, where the gap comes from, and the five fundamental
// choices Parliament keeps refusing to make. Companion to the
// per-dept reports living at /departments/<slug>.
//
// Body sits on the same parchment <article> as /bills/[id] so it
// reads as a continuation of the dossier line. Renderer splits the
// stored text on blank lines and drops each chunk into a <p>; the
// SHOUTING section headers (THE HARD TRUTH, THE FIVE FUNDAMENTAL
// CHOICES PARLIAMENT MUST MAKE etc.) carry the visual hierarchy.
//
// Source text lives at ~/cross-departmental-analysis.txt and is
// pasted inline below so the page renders without a DB call. If we
// later move it into a content table, swap the constant for a fetch.

import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import ScrollToTopButton from '../components/ScrollToTopButton';
import BackLink from '../components/BackLink';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Budget Trade-offs',
  description:
    'What would it cost to fix everything? A cross departmental analysis showing how the £900bn budget actually divides, what each department says it needs, and the five fundamental choices Parliament keeps refusing to make.',
  alternates: { canonical: '/budget-trade-offs' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const ACCENT = '#6b2417';
const SERIF = 'EB Garamond, Garamond, Georgia, "Times New Roman", serif';
const MONO = 'Special Elite, monospace';

const BODY = `TOTAL GOVERNMENT DEPARTMENTAL BUDGET: £900bn annually

COMMITTED BEFORE DISCRETIONARY ALLOCATION:
- Social Protection (pensions, welfare): £410bn (46%)
- Debt Interest: £100bn (8%)
- Total committed: £510bn (57%)
- Available for discretionary: £390bn (43%)

WHAT EACH DEPARTMENT REQUESTS (FROM TRADE-OFF ANALYSIS)

1. NHS/DHSC - £15-18bn additional annually
   - Most critical: waiting lists (7m+), staff burnout, social care collapse
   - Realistic (Option E): £11bn available
   - Gap: £4-7bn

2. DfE (Education) - £9-10bn additional annually
   - Most critical: teacher recruitment, school repairs, SEN funding
   - Realistic (Option E): £5bn available
   - Gap: £4-5bn

3. DWP (Benefits) - £9-10bn additional annually
   - Most critical: UC benefit levels, disability assessments, two-child limit
   - Realistic (Option E): £5.5bn available
   - Gap: £3.5-4.5bn

4. MHCLG (Housing) - £11-13bn additional annually
   - Most critical: social housing, cladding, council funding
   - Realistic (Option E): £7bn available
   - Gap: £4-6bn

5. Home Office - £2.5-3.5bn additional annually (net £1.5-2.5bn after asylum accommodation savings)
   - Most critical: asylum processing, visas, policing
   - Realistic (Option E): £2.5bn available
   - Gap: £0 (roughly balanced)

6. DESNZ (Energy) - £5-7bn additional annually
   - Most critical: grid acceleration, nuclear, heat pumps
   - Realistic (Option E): £5bn available
   - Gap: £0-2bn

7. Treasury - Distributes the budget (not a request)

TOTAL ADDITIONAL FUNDING REQUESTED: £52-63bn annually
REALISTIC TOTAL AVAILABLE (combining all Option E scenarios): £36.5bn
TOTAL GAP: £15-27bn

THE HARD TRUTH

Britain's departmental budget is £900bn. Committed before discretionary allocation: £510bn (pensions, welfare, debt interest).

Remaining for ALL public services: £390bn

Department spending (current):
- NHS: £200bn
- Schools: £80bn
- DWP (admin/support): £70bn (pensions are in protected budget)
- Defence: £70bn
- Other: everything else (environment, culture, justice, transport, etc.)

What departments say they need to function properly: additional £52-63bn

Where this money would come from:
1. Tax rises: 5-6p income tax OR 2-3p VAT OR equivalent
2. Cut other departments: Defence (-£15bn), Transport (-£10bn), Environment (-£5bn), Other services (-£15-27bn)
3. Cut protected benefits: Freeze state pension growth, means-test child benefit (politically impossible)
4. Accept deterioration: Keep current funding, watch services decline

THE REALISTIC SCENARIO (COMBINING ALL OPTION E PATHS)

If government commits to:
- Modest tax rises (raises ~£10bn)
- Efficiency improvements across departments (frees ~£5bn)
- Reallocations from lower to higher priorities (reallocates ~£3bn)
- Growing economy at 2-3% annually (frees ~£5bn)
- Total available: ~£23-28bn

Allocation:
- NHS: £8bn (partial solution to waiting lists and social care)
- Education: £4bn (teacher pay and school repairs, not full solution)
- DWP: £3bn (modest UC increase, not adequate)
- Housing: £4bn (some new homes, councils still struggle)
- Home Office: £2bn (asylum processing improves)
- Energy: £2bn (grid and renewable acceleration)

Result: visible improvement in all areas, but no area fully solved. Waiting lists fall from 7m to 5-6m (still problematic). Teacher pay rises, retention improves but doesn't solve shortage. Housing shortage continues. DWP benefit levels still inadequate.

WHY THIS MATTERS

The institutional reports show that most departments are constrained, not failed. They are operating within tight budgets and making difficult choices. Some institutions (DWP) are choosing cruelty within constraints. Some institutions (NHS) are trying to deliver the impossible.

Treasury is the bottleneck. It distributes a fixed or slowly-growing budget among competing demands. Every allocation to one department is a choice not to allocate to another.

Parliament has not forced Treasury to be honest about this. Departments make requests. Treasury allocates some funds. Services decline. Everyone blames departments for poor performance. Parliament doesn't ask Treasury why it allocated that particular level.

THE FIVE FUNDAMENTAL CHOICES PARLIAMENT MUST MAKE

1. Healthcare vs. Everything Else: Does society want NHS fully funded (costs £15-18bn more) or partially funded (accept waiting lists, longer delays)?

2. Education vs. Everything Else: Does society want schools properly resourced (costs £9-10bn more) or partially resourced (accept teacher shortages, deteriorating buildings)?

3. Social Protection vs. Everything Else: Does society want welfare adequately funding the vulnerable (costs £9-10bn more) or keeping benefit levels low (cost: poverty, child outcomes)?

4. Housing vs. Everything Else: Does society want to solve housing crisis (costs £11-13bn more) or accept ongoing shortage and homelessness?

5. Taxes vs. Services: Does society prefer lower taxes (require service cuts) or higher taxes (maintain/improve services)?

Currently: Parliament pretends all are possible. Result: all are partially done, none fully successful.

RECOMMENDATION

Treasury should present Parliament with a clear budget scenario document showing:
- Current budget allocation by department
- What each department needs to function properly
- Which funding sources are available (tax rises, reallocation, efficiency)
- What happens if each choice is made

Parliament should then vote on priorities explicitly. Not pretend all things are possible.

The institutional reports show the detail. This document shows the landscape.

The problem is not departmental failure. The problem is budgetary reality meeting political denial.`;

export default function BudgetTradeOffsPage() {
  const paragraphs = BODY.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <OpenGovShell pageStamp="Budget Trade-Offs">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
      />

      {/* Same parchment article as /bills/[id] and /bills/[id]/full so
          this page reads as part of the dossier line, not a folder dump. */}
      <article
        style={{
          background: "#efe6d2 url('/bill-parchment.webp') center top / 100% auto repeat-y",
          border: '1px solid rgba(26,20,14,0.3)',
          boxShadow: '0 1px 0 rgba(26,20,14,0.05), 0 22px 44px -22px rgba(26,20,14,0.35)',
          padding: 'clamp(28px, 4vw, 56px) clamp(24px, 4vw, 60px)',
          color: '#1a140e',
          fontFamily: SERIF,
        }}
      >
        <header style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: MONO, fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginBottom: '12px' }}>
            cross departmental analysis
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '16px' }}>
            What would it cost to fix everything?
          </h1>
          <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.7, color: INK_SOFT, maxWidth: '46em' }}>
            Britain's £900bn departmental budget, what each department says it needs to
            function properly, what's realistically available, and the five fundamental
            choices Parliament keeps refusing to make. Companion to the per-department
            Institutional Performance Reports.
          </p>
        </header>

        <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: '28px', maxWidth: '46em' }}>
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                fontFamily: MONO,
                fontSize: '15px',
                lineHeight: 1.75,
                color: INK,
                margin: '0 0 16px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {para}
            </p>
          ))}
        </div>
      </article>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
