import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollToTopButton from '../components/ScrollToTopButton';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: "Top Ten Highest Council Tax Bills in England, 2026/27",
  description:
    "The ten English councils with the highest Band D council tax for 2026/27, including all precepts (council, police, fire, parish). Per-council editorial analysis of each.",
  alternates: { canonical: '/council-tax' },
};

export const revalidate = 3600;

const YEAR_LABEL = '2026/27';
const ENGLAND_AVERAGE = 2392;

// Dossier ink-on-parchment palette
const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const INK_THICK = 'rgba(20,16,13,0.55)';
const ACCENT = '#6b2417';

function fmtMoney(v: number): string {
  return '£' + Math.round(v).toLocaleString('en-GB');
}

type Report = {
  rank: number;
  council: string;
  slug: string;
  tagline: string;
  bandD: number;
  body: string;
  verdict: string;
};

const REPORTS: Report[] = [
  {
    rank: 1,
    council: 'Nottingham',
    slug: 'nottingham',
    tagline: "ENGLAND'S MOST EXPENSIVE MAJOR CITY FOR COUNCIL TAX",
    bandD: 2755,
    body: `Nottingham residents now pay the third highest council tax in England, behind only Dorset and Lewes. Among major cities it is the most expensive in the country. For a city that declared itself bankrupt three years ago, that fact lands heavily.

For years, Nottingham City Council pursued ambitious projects and investments intended to generate income and reduce reliance on central government funding. The most famous was Robin Hood Energy, a council owned energy company that ultimately collapsed after losses running into tens of millions of pounds.

The council effectively declared itself bankrupt in 2023 after issuing a Section 114 notice. Few events damage public confidence more severely than a council admitting it cannot balance its books.

To be fair, today's leadership inherited much of the fallout and has spent much of its time repairing rather than building. Financial controls have tightened and spending has come under greater scrutiny.

Yet residents paying £2,755 a year are entitled to ask a difficult question: why should they carry the burden of mistakes they never made? That annual bill is £363 above the England average. A Band D household in Nottingham pays nearly three times what an equivalent household in Wandsworth pays.

Nottingham remains a vibrant city. Its universities, businesses and cultural institutions are genuine strengths. The city deserves better than the governance failures that have defined much of the council's recent history.`,
    verdict:
      "A city with enormous potential governed by an authority still trying to rebuild trust. Charging the highest council tax of any major English city while recovering from financial collapse makes value for money almost impossible to justify.",
  },
  {
    rank: 2,
    council: 'Rutland',
    slug: 'rutland',
    tagline: "ENGLAND'S SMALLEST COUNTY WITH ENGLAND'S SECOND HIGHEST BILL",
    bandD: 2738,
    body: `Rutland has a simple problem. It is tiny.

Being England's smallest historic county means delivering services to approximately 41,000 residents while carrying many of the same responsibilities as authorities serving populations ten or twenty times larger. With fewer than 17,000 taxable properties, the same fixed costs are divided among far fewer households.

The result is predictable: the second highest council tax in England.

Unlike some councils on this list, Rutland is not associated with scandal, financial collapse or major governance failures. In many respects it is a reasonably well run authority. The £66.57 increase from 2025/26 was the smallest rise on this list, suggesting the council is not aggressively hiking charges.

The problem is perception.

Residents paying nearly £2,740 annually are not comparing themselves to local government accounting spreadsheets. They are comparing themselves to neighbouring areas where council tax is often hundreds of pounds lower.

Road maintenance, transport links and access to services remain recurring concerns. Many residents accept the logic behind higher taxation but question whether the gap has become too large.

Rutland's biggest weakness is that competence rarely feels exciting. Residents are effectively paying a premium simply because geography and demographics make local government more expensive.`,
    verdict:
      "Sensibly managed but expensive. The bill reflects structural reality more than exceptional service.",
  },
  {
    rank: 3,
    council: 'Gateshead',
    slug: 'gateshead',
    tagline: 'THE HIGHEST COUNCIL TAX IN THE NORTH EAST',
    bandD: 2716,
    body: `Gateshead residents pay the highest council tax in the North East and the third highest on this list. For that price, residents might reasonably expect streets polished to a shine, public services running like clockwork and neighbourhoods that look like a showcase for local government success.

The reality is more complicated.

Gateshead Council has a strong case when it points to years of government funding reductions, rising demand for adult social care and increasing pressure on children's services. The council's own explanation is direct: a low tax base means areas like Gateshead appear to have disproportionately high council tax compared to other authorities. They are not wrong. These are genuine financial burdens faced by councils across the country.

The council can also point to real achievements. Regeneration around Gateshead Quays has transformed parts of the borough. Investment has attracted visitors, businesses and cultural institutions. In terms of ambition, Gateshead has often looked more forward thinking than many comparable northern authorities.

Yet residents do not live in regeneration brochures.

Away from the waterfront developments and flagship projects, a different picture emerges. Concerns about litter, anti social behaviour, struggling high streets and tired public spaces remain familiar complaints. Many residents paying over £2,700 a year are entitled to ask why visible neighbourhood improvements do not always seem to match the scale of the tax bill landing on their doormat.

Supporters argue the council is being judged unfairly. Social care now consumes huge portions of local authority budgets, leaving less money available for the services residents actually see.

Critics counter that this explanation has become too convenient. Every council faces pressures. Gateshead's residents are paying more than almost anybody else. The higher the bill climbs, the less patience people have for explanations.

For a council charging £2,716 a year, competence is not enough. Residents expect excellence.`,
    verdict:
      "Ambitious and financially pressured, but charging premium prices creates premium expectations. Too often, residents still feel they are paying luxury rates for standard local government.",
  },
  {
    rank: 4,
    council: 'Bristol',
    slug: 'bristol',
    tagline: 'A PROGRESSIVE CITY WITH VERY EXPENSIVE PROBLEMS',
    bandD: 2714,
    body: `Bristol is one of Britain's most successful cities. It attracts investment, graduates, technology firms and creative industries. On paper, it should be thriving.

Yet Bristol residents paying over £2,700 a year often wonder where the money is going. The £130 increase from last year was among the steepest on this list.

Housing affordability remains one of the city's biggest failures. Congestion frustrates commuters daily. Homelessness remains highly visible. Public services operate under constant strain.

The council excels at developing ambitious visions. Climate strategies, transport plans and regeneration projects rarely lack ambition.

Delivery is another matter.

Critics argue Bristol has become a city where consultation documents multiply faster than practical improvements. Residents often hear about long term transformation while dealing with short term frustrations.

Supporters counter that Bristol's growth creates many of its challenges. More people means greater pressure on housing, roads and services.

That is true, but it also means taxpayers reasonably expect solutions.`,
    verdict: 'Dynamic city, frustrating council. Strong on ideas, weaker on execution.',
  },
  {
    rank: 5,
    council: 'Liverpool',
    slug: 'liverpool',
    tagline: 'A GREAT CITY, A TROUBLED COUNCIL',
    bandD: 2674,
    body: `Liverpool is one of Britain's great cities.

Liverpool City Council is another matter.

Government intervention followed serious concerns about governance, planning and procurement. Few councils have faced such public scrutiny in recent years.

The city itself has undergone remarkable transformation. Tourism, culture, universities and private investment have changed Liverpool dramatically.

Unfortunately, much of that progress has occurred alongside repeated questions about how the council conducts its business.

The authority has improved since intervention began. Reforms have been implemented and oversight strengthened.

But trust lost is not easily regained.

Residents paying over £2,670 annually are entitled to ask why a council charging so much needed central government intervention in the first place. The £127 year on year increase means the bill is climbing faster than many household incomes.`,
    verdict: 'Improving, but past failures continue to undermine confidence.',
  },
  {
    rank: 6,
    council: 'Walsall',
    slug: 'walsall',
    tagline: 'PAYING MORE, EXPECTING MORE',
    bandD: 2627,
    body: `Walsall's council tax bill places it among the most expensive authorities in England, more than £230 above the national average. That comes as a surprise to some residents who struggle to identify obvious signs of premium service.

The council deserves praise for maintaining financial stability and achieving strong results in children's services. Those are not small accomplishments.

Yet outside official reports, many residents tell a different story.

Town centre decline, anti social behaviour and economic stagnation dominate local conversations. Too many areas appear stuck between regeneration promises and visible reality.

The council's defence is familiar: demand is rising, funding is tight and social care consumes growing proportions of the budget.

All true.

The problem is that residents rarely judge councils on adult social care budgets. They judge them on the streets they walk down every day.`,
    verdict:
      "Strong in some critical services but struggling to convince residents they are getting value from one of England's highest tax bills.",
  },
  {
    rank: 7,
    council: 'Reading',
    slug: 'reading',
    tagline: 'PROSPERITY WITH A PREMIUM PRICE TAG',
    bandD: 2613,
    body: `Reading benefits from something many councils would envy: a strong economy.

Major employers, excellent transport connections and proximity to London should provide advantages that many local authorities can only dream about.

Yet residents still face a council tax bill more than £220 above the national average.

The council is generally regarded as competent and financially stable. There are no major scandals or dramatic failures.

The criticism is more subtle.

Residents often feel they are paying premium prices for ordinary outcomes. Housing remains expensive. Congestion remains severe. Public services remain under pressure.

A prosperous town should make local government easier, not harder.`,
    verdict:
      'Competent administration, but residents are paying luxury prices for a service that often feels standard.',
  },
  {
    rank: 8,
    council: 'Northumberland',
    slug: 'northumberland',
    tagline: 'PAYING FOR DISTANCE',
    bandD: 2597,
    body: `Northumberland is unique on this list because geography explains much of the cost.

The county stretches across vast rural areas. Roads must be maintained across enormous distances. Services must reach isolated communities. Transport costs are higher. Everything costs more.

Unlike urban authorities, Northumberland cannot rely on dense populations to spread costs. The £132 year on year increase reflects both rising service costs and the structural disadvantage of serving England's most sparsely populated county.

The council's challenge is convincing residents that higher taxation genuinely reflects those realities rather than inefficiency.

In fairness, the authority performs relatively well compared with many rural counterparts. Tourism investment, road maintenance and local services generally avoid the crises seen elsewhere.

Yet rural residents still complain about disappearing services, weak transport links and growing isolation.`,
    verdict: 'Expensive but largely understandable. Geography is a more convincing explanation than incompetence.',
  },
  {
    rank: 9,
    council: 'Newcastle',
    slug: 'newcastle',
    tagline: 'TWO CITIES IN ONE',
    bandD: 2542,
    body: `Newcastle tells two very different stories.

The first is the city centre. Regeneration, investment, universities and business growth have helped transform Newcastle into one of northern England's strongest urban economies.

The second story lies beyond the showcase areas.

Residents frequently raise concerns about road conditions, litter, anti social behaviour and neighbourhood decline. Critics argue that the city often looks strongest where visitors spend time and weakest where residents live.

The council deserves credit for attracting investment and navigating difficult financial pressures.

But a council tax bill exceeding £2,500, with a £129 increase this year alone, creates expectations that extend beyond the city centre.`,
    verdict: 'Strong regeneration record, inconsistent neighbourhood experience.',
  },
  {
    rank: 10,
    council: 'Coventry',
    slug: 'coventry',
    tagline: 'REGENERATION WITHOUT UNIVERSAL REWARD',
    bandD: 2517,
    body: `Coventry has spent years reinventing itself.

City of Culture status, regeneration projects and substantial investment have reshaped large parts of the city. Few councils can point to such visible transformation.

Yet the council faces a recurring criticism.

Residents see cranes, construction projects and ambitious announcements, but often struggle to identify equivalent improvements in everyday services.

Road conditions, neighbourhood maintenance and local concerns frequently receive less attention than headline grabbing regeneration schemes.

Supporters argue the council is planning for the future.

Critics argue residents live in the present.

Both sides have a point.

The challenge facing Coventry is proving that investment eventually benefits every part of the city rather than a select number of flagship projects.`,
    verdict:
      'Ambitious and forward looking, but many residents remain unconvinced they are receiving full value for a £2,517 annual bill.',
  },
];

export default function CouncilTaxPage() {
  const grandTotal = REPORTS.reduce((s, r) => s + r.bandD, 0);
  const avg = Math.round(grandTotal / REPORTS.length);

  return (
    <OpenGovShell pageStamp="Council Tax">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '-6%',
          marginBottom: '12px',
          color: INK,
          textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p
          style={{
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: ACCENT,
          }}
        >
          Open Govt &middot; Council Tax
        </p>
        <h1
          style={{
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            transform: 'rotate(-0.3deg)',
            textShadow: '1px 1px 0px rgba(0,0,0,0.1)',
          }}
        >
          The ten highest council tax bills in England, {YEAR_LABEL}
        </h1>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '15px',
            lineHeight: 1.75,
            maxWidth: '720px',
            marginBottom: '20px',
          }}
        >
          Ranked by total Band D council tax. Figures include all precepts: council, police, fire,
          regional authority and parish where applicable. Each authority gets an editorial
          assessment.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <Stat label="Top 10 combined" value={fmtMoney(grandTotal)} />
          <Stat label="Top 10 average" value={fmtMoney(avg)} />
          <Stat label="England average" value={fmtMoney(ENGLAND_AVERAGE)} />
        </div>
      </header>

      {REPORTS.map((r) => (
        <ReportBlock key={r.slug} report={r} />
      ))}

      <p
        style={{
          marginTop: '40px',
          fontFamily: 'Special Elite, monospace',
          fontSize: '13px',
          color: INK_SOFT,
          lineHeight: 1.75,
        }}
      >
        Note: All figures are Band D council tax for 2026/27. Figures include all precepts:
        council, police, fire, regional authority and parish where applicable. England average Band
        D 2026/27: £2,392.
      </p>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}

// One editorial block per council. Header strip with rank + council name +
// tagline + Band D figure; flowing body in serif; verdict pulled out as a
// distinct quote-style block. Each block links to /councils/[slug] in two
// places: the council name in the header, and a footer "Full profile" link.
function ReportBlock({ report }: { report: Report }) {
  const paragraphs = report.body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <article
      style={{
        marginTop: '40px',
        marginBottom: '20px',
        borderTop: `2px solid ${INK}`,
        paddingTop: '24px',
      }}
    >
      {/* Header strip: rank on the left as a large numeral; name + tagline
          + price stacked on the right. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '24px',
          marginBottom: '18px',
        }}
      >
        <div
          aria-hidden
          style={{
            fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: 'bold',
            lineHeight: 1,
            color: ACCENT,
            letterSpacing: '-0.04em',
            flexShrink: 0,
            transform: 'rotate(-0.4deg)',
          }}
        >
          {report.rank}
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <Link
            href={`/councils/${report.slug}`}
            className="no-hover-scale"
            style={{ color: INK, textDecoration: 'none' }}
          >
            <h2
              style={{
                fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
                fontSize: 'clamp(16px, 2.2vw, 22px)',
                fontWeight: 'bold',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                margin: '0 0 6px',
                color: INK,
              }}
            >
              {report.council.toUpperCase()}: {report.tagline}
            </h2>
          </Link>
          <p
            style={{
              fontFamily: 'Special Elite, monospace',
              fontSize: '13px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: INK_SOFT,
              margin: 0,
            }}
          >
            Council Tax (Band D, {YEAR_LABEL}):{' '}
            <span
              style={{
                color: INK,
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
              }}
            >
              {fmtMoney(report.bandD)}
            </span>
          </p>
        </div>
      </div>

      {/* Editorial body — Special Elite per the site-wide typewriter
          rule (see memory feedback_typewriter_for_body_prose). Serif
          reserved for headlines + the masthead. */}
      <div
        style={{
          fontFamily: 'Special Elite, monospace',
          fontSize: '15px',
          lineHeight: 1.85,
          color: INK,
          maxWidth: '720px',
        }}
      >
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: '0 0 16px' }}>
            {p}
          </p>
        ))}
      </div>

      {/* Verdict pull-out */}
      <aside
        aria-label="Verdict"
        style={{
          marginTop: '20px',
          padding: '14px 18px',
          borderLeft: `4px solid ${ACCENT}`,
          background: 'rgba(20,16,13,0.04)',
          maxWidth: '720px',
        }}
      >
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '13px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: ACCENT,
            margin: '0 0 6px',
            fontWeight: 'bold',
          }}
        >
          Verdict
        </p>
        <p
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '14px',
            lineHeight: 1.7,
            color: INK,
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          {report.verdict}
        </p>
      </aside>

      {/* Profile link */}
      <p style={{ marginTop: '14px', marginBottom: 0 }}>
        <Link
          href={`/councils/${report.slug}`}
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: ACCENT,
            textDecoration: 'none',
            borderBottom: `1px solid ${INK_THICK}`,
            paddingBottom: '2px',
          }}
        >
          Full {report.council} council profile →
        </Link>
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${INK_HAIRLINE}`,
        padding: '14px 16px',
      }}
    >
      <p
        style={{
          fontFamily: 'Special Elite, monospace',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: INK_SOFT,
          margin: '0 0 6px',
          fontWeight: 'bold',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'Special Elite, monospace',
          fontSize: '22px',
          fontWeight: 'bold',
          letterSpacing: '0.01em',
          color: INK,
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
