// /your-tax-pound — Where each £1 of UK government spending goes,
// broken into 12 categories. Data is HM Treasury PESA 2022/23 via the
// IFS-style "Components of UK government spending" view, supplied as a
// spreadsheet. Eleven named major categories plus a real Other bucket
// of ~24p that catches government admin, business/industry, environment,
// culture, agriculture, contingency reserves, devolved-administration
// block grants and miscellaneous lines too small to call out individually.
//
// Hero area at the top is a placeholder for a ChatGPT-designed visual at
// /tax-pound-art.webp. Until that file exists the slot renders the paper
// texture with the year stamp.

import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import ScrollToTopButton from '../components/ScrollToTopButton';
import BackLink from '../components/BackLink';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Your Tax Pound, Where £1 Goes',
  description:
    'Every pound of UK government spending broken down, NHS, pensions, welfare, education, debt interest, defence and the rest, with a paragraph explaining what each line actually buys.',
  alternates: { canonical: '/your-tax-pound' },
};

const INK = '#14100d';
const ACCENT = '#6b2417';

type Bucket = {
  pence: number;       // rounded for display
  sharePct: number;    // exact percentage from the source
  category: string;
  prose: string;
  deptHref?: string;
  deptLabel?: string;
};

const BUCKETS: Bucket[] = [
  {
    pence: 18, sharePct: 18.3,
    category: 'Health',
    prose:
      "NHS England plus the Barnett share that funds NHS Scotland, NHS Wales and Health and Social Care Northern Ireland. Hospitals, GPs, prescriptions, dentistry, mental health services, public health and the NHS workforce. The line has grown almost every year for two decades and will keep growing while the population ages and treatments get more expensive. The bulk of the current parliament's domestic policy argument, waiting lists, social care funding, the workforce plan, sits inside this one budget.",
    deptHref: '/departments/health',
    deptLabel: 'Department of Health and Social Care',
  },
  {
    pence: 12, sharePct: 12.2,
    category: 'Social security, pensioners',
    prose:
      "The Basic State Pension, the New State Pension and Pension Credit. Paid to anyone above State Pension age who has the required National Insurance record. Protected by the Triple Lock since 2011, payments rise each year by the highest of CPI inflation, average earnings growth or 2.5%. The Triple Lock cost the Treasury well above forecast during the 2022 inflation shock and is the largest contingent fiscal commitment in the welfare system.",
    deptHref: '/departments/work-pensions',
    deptLabel: 'Department for Work and Pensions',
  },
  {
    pence: 10, sharePct: 10.2,
    category: 'Social security, working age and children',
    prose:
      "Universal Credit, Personal Independence Payment, child benefit, statutory sick pay, housing benefit, attendance allowance, carer's allowance, employment and support allowance. Most of the working age welfare debate, the two child benefit cap, PIP eligibility, disability assessments, is about this line. Moves with caseload rather than with policy alone, which is why the figure rises automatically when the labour market weakens or when more people qualify for support.",
    deptHref: '/departments/work-pensions',
    deptLabel: 'Department for Work and Pensions',
  },
  {
    pence: 9, sharePct: 9.1,
    category: 'Education',
    prose:
      "Schools, sixth forms, further education colleges, apprenticeships, early years (the so called free hours), tuition fee support and student loans, and the education research budget. Funded through grants to local authorities for state schools and direct to academies and colleges. The VAT on private school fees and the free breakfast clubs commitments sit inside this envelope. Scotland, Wales and Northern Ireland education spending is devolved through Barnett and shows on their devolved budgets.",
    deptHref: '/departments/education',
    deptLabel: 'Department for Education',
  },
  {
    pence: 8, sharePct: 8.4,
    category: 'Net debt interest',
    prose:
      "Interest payments on UK government gilts, net of the dividend the Bank of England pays the Treasury on its Asset Purchase Facility holdings. Around 5p before the pandemic, peaked above 10p in 2022/23 as the inflation shock pushed up rates and the index linked gilt uplift, and has been easing slowly as the Bank brings rates down. This is the price of past borrowing rather than new spending; reducing it requires either lower rates, lower inflation, or smaller deficits.",
  },
  {
    pence: 5, sharePct: 4.8,
    category: 'Defence',
    prose:
      "Armed forces personnel and equipment, MOD operations, intelligence services contribution, the AUKUS submarine programme, the Trident nuclear deterrent and military, financial and diplomatic support to Ukraine. Labour brought the 2.5% of GDP defence spending commitment forward to 2027 in February 2025, funded by cutting overseas aid from 0.5% to 0.3% of GNI. This line is set to rise sharply through the rest of the parliament.",
    deptHref: '/departments/defence',
    deptLabel: 'Ministry of Defence',
  },
  {
    pence: 4, sharePct: 3.8,
    category: 'Transport',
    prose:
      "Roads, the rail network subsidy (now including the renationalised train operators), HS2, local authority transport grants, aviation oversight, ports, cycling and walking infrastructure. HS2 dominates the capital cost. The largest recurring annual cost is keeping the railway running. Most local transport spending comes through this line via grants to councils and combined authorities.",
    deptHref: '/departments/transport',
    deptLabel: 'Department for Transport',
  },
  {
    pence: 4, sharePct: 3.8,
    category: 'Public order and safety',
    prose:
      "Police, prisons, courts and tribunals, probation, the Crown Prosecution Service, fire and rescue services and immigration enforcement. The prisons capacity crisis through 2024 and 2025, the asylum accommodation overspend, the Border Security Command, the small boats enforcement budget and the post Sentencing Review costs all sit inside this line.",
    deptHref: '/departments/home',
    deptLabel: 'Home Office',
  },
  {
    pence: 2, sharePct: 2.4,
    category: 'Long term care',
    prose:
      "Adult social care, care homes, domiciliary care, support for working age disabled adults. Funded primarily by local authorities through council tax and central government grant. The Dilnot cap on care costs was legislated under Hunt for October 2023, deferred to October 2025, then scrapped entirely by Reeves in July 2024. Long term care funding is the largest unresolved structural question in domestic public policy.",
    deptHref: '/departments/health',
    deptLabel: 'Department of Health and Social Care',
  },
  {
    pence: 2, sharePct: 1.5,
    category: 'Housing and community amenities',
    prose:
      "Central government investment in social housing, parts of housing benefit not counted under social security, water and waste regulation, planning policy support, energy market regulation and Building Safety Regulator costs. Labour's commitment to 1.5 million homes over the parliament will pull this line upwards as social housing investment ramps.",
    deptHref: '/departments/housing-communities',
    deptLabel: 'Ministry of Housing, Communities and Local Government',
  },
  {
    pence: 1, sharePct: 1.1,
    category: 'Overseas aid',
    prose:
      "Foreign, Commonwealth and Development Office aid budget, humanitarian response, contributions to multilateral organisations including the United Nations. Cut from 0.7% of GNI to 0.5% in 2021 by Sunak. Cut again to 0.3% of GNI by Starmer in February 2025 to help fund the defence spending uplift. The smallest of the named categories on this view and the most often cut first.",
    deptHref: '/departments/foreign-office',
    deptLabel: 'Foreign, Commonwealth and Development Office',
  },
  {
    pence: 24, sharePct: 24.3,
    category: 'Other',
    prose:
      "The largest single line on this view, and the one that least gets debated. Other covers everything not in the eleven named buckets above: government administration (civil service running costs, central government operations, Parliament, HMRC's own cost), business and industry support (UK Research and Innovation, regional growth funds, sectoral subsidies for steel, automotive and semiconductors, the Great British Energy capitalisation), environmental protection and flood defence, recreation, culture and sport, agriculture and rural affairs, the contingency reserve, unfunded public sector pension contributions, and devolved administration block grants for activities not categorised under health, education or welfare. Roughly a quarter of every pound spent falls outside the eleven big public facing buckets.",
  },
];

export default function YourTaxPoundPage() {
  const totalPct = BUCKETS.reduce((s, b) => s + b.sharePct, 0);
  const totalPence = BUCKETS.reduce((s, b) => s + b.pence, 0);

  return (
    <OpenGovShell>
      <style>{`
        .tp-section { padding: 22px 0; border-bottom: 1px solid rgba(20,16,13,0.18); }
        .tp-section:last-child { border-bottom: none; }
        .tp-row { display: flex; align-items: baseline; gap: 18px; margin-bottom: 8px; flex-wrap: wrap; }
        .tp-pence { font-family: 'Special Elite', monospace; font-size: 42px; font-weight: bold; color: ${ACCENT}; line-height: 1; min-width: 84px; }
        .tp-cat { font-family: 'Georgia', 'Times New Roman', serif; font-size: 26px; font-weight: bold; letter-spacing: -0.01em; }
        .tp-share { font-family: 'Special Elite', monospace; font-size: 13px; opacity: 0.55; margin-left: auto; }
        .tp-prose { font-family: 'Special Elite', monospace; font-size: 16px; line-height: 1.65; color: ${INK}; max-width: 70ch; margin: 8px 0 0 0; }
        .tp-dept { display: inline-block; margin-top: 10px; font-family: 'Special Elite', monospace; font-size: 13px; opacity: 0.7; color: ${INK}; text-decoration: none; }
        .tp-dept:hover { opacity: 1; text-decoration: underline; }
        .tp-bar { height: 28px; display: flex; width: 100%; margin: 18px 0 12px; border: 1px solid ${INK}; }
        .tp-bar > span { display: block; height: 100%; border-right: 1px solid rgba(20,16,13,0.25); }
        .tp-bar > span:last-child { border-right: none; }
      `}</style>

      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '10px', opacity: 0.7 }}>
          Where Your Money Goes
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4.6vw, 56px)', fontWeight: 'bold', letterSpacing: '-0.02em', lineHeight: 1.0, marginBottom: '14px' }}>
          Your Tax Pound
        </h1>
        <p style={{ fontFamily: 'Special Elite, monospace', fontSize: 'clamp(14px, 1.7vw, 18px)', lineHeight: 1.65, maxWidth: '74ch', opacity: 0.92 }}>
          For every £1 the UK government spends, this is where it goes. Twelve lines, eleven named categories
          covering most domestic policy, plus a real Other bucket of around 24p that catches government administration,
          business support, environment, culture, agriculture, contingency reserves and the parts of the budget that
          rarely make headlines. Pence figures rounded; exact share shown alongside each line.
        </p>
      </header>

      {/* Hero visual slot — ChatGPT-designed image lands at /tax-pound-art.webp. */}
      <div
        aria-hidden
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          marginBottom: '4%',
          background: `url('/tax-pound-art.webp') center/cover no-repeat, repeating-linear-gradient(33deg, rgba(20,13,4,.035) 0 1px, transparent 1px 7px), #e7d2a0`,
          border: `1px solid rgba(20,16,13,0.2)`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '14px 18px',
          fontFamily: 'Special Elite, monospace',
          fontSize: '12px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: INK,
          opacity: 0.95,
        }}
      >
        HM Treasury · 2022 / 23
      </div>

      {/* Compact ink-bar at scale: one segment per category, width
          proportional to share. Renders even before the ChatGPT visual lands. */}
      <div className="tp-bar" aria-label="Visual breakdown of £1 of UK government spending">
        {BUCKETS.map((b, i) => {
          const shades = ['#14100d', '#3a2a1c', '#5e4a30', '#8a6e48', '#b59364'];
          const shade = shades[i % shades.length];
          return (
            <span
              key={b.category}
              title={`${b.pence}p · ${b.category} (${b.sharePct}%)`}
              style={{ width: `${b.sharePct}%`, background: shade }}
            />
          );
        })}
      </div>

      <p style={{ fontFamily: 'Special Elite, monospace', fontSize: '12px', opacity: 0.7, marginBottom: '5%', textAlign: 'right' }}>
        Total: {totalPence}p · {totalPct.toFixed(1)}% of spending
      </p>

      {/* The 12 sections — each is pence + heading + share + prose +
          optional department link. Order is descending by share. */}
      <div>
        {BUCKETS.map((b) => (
          <section key={b.category} className="tp-section">
            <div className="tp-row">
              <div className="tp-pence">{b.pence}p</div>
              <div className="tp-cat">{b.category}</div>
              <div className="tp-share">{b.sharePct}%</div>
            </div>
            <p className="tp-prose">{b.prose}</p>
            {b.deptHref && (
              <a href={b.deptHref} className="tp-dept">
                → {b.deptLabel}
              </a>
            )}
          </section>
        ))}
      </div>

      <footer style={{ marginTop: '5%', paddingTop: '24px', borderTop: `2px solid ${INK}`, fontFamily: 'Special Elite, monospace', fontSize: '13px', lineHeight: 1.65, opacity: 0.78, maxWidth: '72ch' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Source.</strong> HM Treasury Public Expenditure Statistical Analyses (PESA), components of UK
          government spending in 2022/23. Twelve-category view (eleven named + Other), commonly used by the
          Institute for Fiscal Studies and other budget commentators.
        </p>
        <p style={{ margin: '0' }}>
          <strong>Methodology.</strong> Shares are exact to one decimal place; pence figures rounded so the bar reads
          cleanly at scale. Scotland, Wales and Northern Ireland have their own devolved spending, their share comes
          through the Barnett formula and lands inside the relevant UK-wide categories above (most visibly inside
          Health and Education).
        </p>
      </footer>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
