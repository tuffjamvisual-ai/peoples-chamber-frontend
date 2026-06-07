import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: 'ten-worst-performing-councils-england',
  kicker: 'Investigation',
  headline: 'The ten worst performing councils in England',
  standfirst:
    "Since 2018, seven English councils have declared themselves effectively bankrupt. One was abolished entirely. Another went bankrupt three times. A borough council with an annual budget of £16 million accumulated debts of £1.8 billion. England's largest local authority is still under government commissioners two years after its collapse. Sixty three more councils are considered at risk. The ten worst failures in modern English local government expose a system where the safeguards designed to prevent catastrophe failed at every level. These are the councils that broke, the decisions that broke them, and the residents left paying the bill.",
  publishedAt: '2026-06-07',
  authorByline: "The People's Chamber",
  heroImage: '/councils.webp',
  heroAlt: 'A composite illustration: a sweep of English council buildings under a heavy sky, the shadow of Section 114 across the rooftops.',
  body: [
    {
      type: 'councilEntry',
      rank: 1,
      name: 'Woking Borough Council',
      councilSlug: 'woking',
      topLine: 'Section 114 notice: June 2023. Deficit: £1.2 billion against a £16 million annual budget.',
      paragraphs: [
        "No council in England has produced a more spectacular financial failure than Woking. A local authority with annual revenue of £16 million accumulated debts of £1.2 billion through a strategy that amounted to institutional gambling. The deficit was seventy five times the council's annual income.",
        'Woking borrowed vast sums to invest in commercial property and regeneration projects, including the Victoria Square development in the town centre. The strategy was intended to generate income that would offset declining central government grants. Instead it produced losses on a scale that no council of Woking\'s size could ever repay.',
        'Independent reviews found the council had not followed proper accounting processes. Money was borrowed without adequate provision for repayment. Loans were made to council owned companies on terms no commercial lender would have accepted. Governance structures that should have prevented this failed at every level.',
        'Government commissioners were appointed to oversee recovery. By 2025, the council remained under intervention with no clear timeline for exit. Essential spending controls continue. Residents who had no involvement in the decisions that created the crisis face years of reduced services while the authority attempts to stabilise finances that may never fully recover.',
        'The fundamental question remains unanswered: how was a borough council allowed to borrow seventy five times its annual income without any external body intervening before the collapse became inevitable?',
      ],
      verdict: 'The worst financial failure in modern English local government. Not a victim of austerity. A victim of recklessness.',
    },
    {
      type: 'councilEntry',
      rank: 2,
      name: 'Birmingham City Council',
      councilSlug: 'birmingham',
      topLine: 'Section 114 notice: September 2023. Gap: £87 million in year, up to £760 million in equal pay liabilities.',
      paragraphs: [
        'Birmingham is the largest local authority in Europe. Its failure was proportionate.',
        'The immediate trigger was an £87 million funding gap combined with up to £760 million in outstanding equal pay claims. Female council workers, predominantly in roles such as cleaning, catering and care, had been systematically underpaid compared to male colleagues. The council knew about the liability. It failed to resolve it. The bill grew for over a decade.',
        'Commissioners appointed in October 2023 found an authority needing "root and branch reform." In their October 2025 statement, commissioners confirmed they remain in place two years later. The council has announced £148 million in cuts. Services have been reduced or eliminated. Council tax has risen by more than ten percent across two successive years.',
        "Birmingham's failure was not a single bad investment. It was the accumulation of years of institutional dysfunction: a failed Oracle IT system costing hundreds of millions, unresolved equal pay obligations stretching back decades, rising social care demand consuming ever larger budget shares, and a political culture that deferred difficult decisions until deferral was no longer possible.",
        "Residents of England's second city are paying substantially more for substantially less. The commissioners show no sign of leaving.",
      ],
      verdict: 'A failure of scale, governance and political courage. The equal pay liability alone should have been resolved years before it became existential.',
    },
    {
      type: 'councilEntry',
      rank: 3,
      name: 'Croydon London Borough',
      councilSlug: 'croydon',
      topLine: 'Section 114 notices: November 2020, December 2020, November 2022. Total debt: £1.6 billion.',
      paragraphs: [
        'No council in modern English history has declared itself bankrupt three times. Croydon issued two notices within three weeks in late 2020, then a third in 2022.',
        'The origins lay in an aggressive property investment strategy. The council borrowed heavily to fund commercial developments, including a major hotel purchase and significant investments through its development company Brick by Brick. When property values fell and rental income failed to materialise, losses became unmanageable.',
        'By the third notice, total debt stood at £1.6 billion, comprising £1.3 billion of General Fund borrowing and £300 million of Housing Revenue Account debt. The council was spending £47 million a year, roughly one sixth of its entire budget, servicing existing debt before a single service was delivered.',
        'Government commissioners were appointed in 2021. Council tax was increased by fifteen percent in a single year. Libraries closed. Youth provision was reduced. Community organisations lost funding.',
        'By 2025, the council remains in a recovery phase. Debt repayments continue to consume a disproportionate share of annual revenue. The authority that declared bankruptcy three times has stabilised but has not recovered. The communities affected by the cuts have not been made whole.',
      ],
      verdict: 'The only council in modern England to go bankrupt three times. A permanent case study in what happens when commercial ambition replaces public service.',
    },
    {
      type: 'councilEntry',
      rank: 4,
      name: 'Thurrock Council',
      councilSlug: 'thurrock',
      topLine: 'Section 114 notice: December 2022. Deficit: £469 million.',
      paragraphs: [
        "Thurrock's collapse was driven by one of the most aggressive investment strategies ever pursued by a local authority. The council invested over £1 billion in a portfolio including solar farms, commercial property and energy bonds, funded almost entirely through borrowing.",
        'When values fell and returns failed, the council was left with a £469 million deficit. Essex County Council was appointed as commissioner.',
        "The strategy had been presented as innovative income generation. In reality it exposed taxpayers to risks that would have been considered reckless in the private sector. Officers and elected members approved investments bearing no relationship to the council's core purpose of delivering local services.",
        'By 2025, the council remains under commissioner oversight and received Exceptional Financial Support from government in 2024/25. Residents face ongoing spending restrictions with no clear exit from intervention.',
      ],
      verdict: 'A council that forgot what it was for.',
    },
    {
      type: 'councilEntry',
      rank: 5,
      name: 'Slough Borough Council',
      councilSlug: 'slough',
      topLine: 'Section 114 notice: July 2021. Projected deficit: £159 million by 2024/25.',
      paragraphs: [
        "Slough's failure was distinguished by something worse than bad investment. The council's own accounting was wrong.",
        'An independent review found the council had been incorrectly calculating its Minimum Revenue Provision since 2016/17. Asset lives were overstated. Capital receipts were used improperly. Some borrowing was omitted from calculations entirely. The financial position looked manageable on paper while deteriorating rapidly underneath.',
        'When the new chief finance officer reviewed the books, the true deficit emerged: £96 million in the current year, projected to reach £159 million within four years.',
        'Government commissioners were appointed. In 2025, the government announced it was minded to extend intervention at Slough. The council received Exceptional Financial Support in 2024/25 alongside Birmingham. Assets continue to be sold. Services continue to be cut. Four years after the Section 114 notice, recovery is incomplete.',
      ],
      verdict: 'Not just financial failure but accounting failure. A council that did not know how much money it had, how much it owed, or how much it needed.',
    },
    {
      type: 'councilEntry',
      rank: 6,
      name: 'Nottingham City Council',
      councilSlug: 'nottingham',
      topLine: 'Section 114 notices: December 2021 and November 2023. In year gap: £23 million.',
      paragraphs: [
        "Nottingham's collapse centred on Robin Hood Energy, a council owned energy company launched in 2015 with the stated aim of providing cheaper energy to local residents. The company lost tens of millions of pounds before being wound up in 2020.",
        'The energy venture was part of a broader pattern. Nottingham pursued commercial activities intended to generate revenue. The ambition was defensible. The execution was not. Oversight was inadequate. Losses were absorbed for years before the cumulative damage became impossible to conceal.',
        'Government commissioners were appointed. By 2025, Nottingham charges the third highest council tax in England at £2,755 for a Band D property. Residents are paying premium prices for a council still in recovery mode. The commissioners remain in place with no announced departure date.',
      ],
      verdict: 'Ambition is not a substitute for financial discipline. Robin Hood Energy took from the council taxpayers and gave to nobody.',
    },
    {
      type: 'councilEntry',
      rank: 7,
      name: 'Northamptonshire County Council',
      // No /councils slug: the old county council was abolished in
      // April 2021 and replaced by West Northamptonshire and North
      // Northamptonshire (both queryable separately).
      topLine: 'Section 114 notices: February 2018 and July 2018. The first in nearly twenty years.',
      paragraphs: [
        'Northamptonshire holds a unique distinction. It was not rescued, restructured or placed under commissioners. It was abolished entirely.',
        'The county council issued the first Section 114 notice since Hackney in 2000. The immediate cause was an inability to balance the budget. The deeper cause was years of poor financial management and inadequate political oversight.',
        'Commissioners recommended the most radical solution available: abolish the county council and its seven district councils and replace them with two unitary authorities, West Northamptonshire and North Northamptonshire. The old councils ceased to exist in April 2021.',
        'By 2025, the new authorities have been operating for four years. They inherited the problems of the old councils without the institutional memory to understand them. Whether the reorganisation delivered better outcomes for residents remains contested. What is not contested is that the original county council failed so completely that its abolition was considered the only viable option.',
      ],
      verdict: 'The council that proved failure has consequences. Abolished because no other intervention was considered sufficient.',
    },
    {
      type: 'councilEntry',
      rank: 8,
      name: 'Liverpool City Council',
      councilSlug: 'liverpool',
      topLine: 'Government intervention: June 2021. Cause: governance, planning and procurement.',
      paragraphs: [
        "Liverpool's crisis was different from the financial collapses elsewhere on this list. The council did not issue a Section 114 notice. Instead the government intervened directly after a report identified serious failings in governance, planning decisions, procurement practices and financial management.",
        'The report described a culture in which proper processes were bypassed, decisions were made without adequate scrutiny, and financial controls were insufficient. Commissioners were appointed to oversee planning, highways, property management and governance.',
        "By 2025, the intervention has produced reforms. Oversight has been strengthened. Processes have been tightened. But commissioners remain involved and the reputational damage persists. Liverpool's problem was not that it ran out of money. It was that the systems meant to ensure public money was spent properly had broken down.",
      ],
      verdict: 'Financial solvency is not the same as good governance. A council can remain solvent while fundamentally failing in how it conducts public business.',
    },
    {
      type: 'councilEntry',
      rank: 9,
      name: 'Sandwell Metropolitan Borough Council',
      councilSlug: 'sandwell',
      topLine: 'Government intervention: March 2022. Cause: persistent governance failures.',
      paragraphs: [
        "Sandwell's problems accumulated over years rather than erupting in a single crisis. A succession of governance concerns, political disputes, allegations of misconduct and failures of leadership created an authority that struggled to function effectively.",
        'Commissioners were appointed after concluding the council was failing its best value duty. The issues were not primarily financial. They were cultural. Decision making was poor. Political leadership was unstable. Senior officers operated in an environment where accountability was weak and scrutiny ineffective.',
        'Sandwell serves some of the most deprived communities in the West Midlands. Residents who needed effective local government most were least likely to receive it. Housing, employment, education and public health outcomes lagged behind comparable authorities.',
        "The intervention formally ended on 22 March 2024 after a two year period. Commissioners said the council was now 'capable of taking forward its improvement independently' and described the authority as a 'far cry' from where it had started. The cultural change required to fix Sandwell's governance was achieved on paper. The underlying conditions in the borough, deep deprivation and stretched services, remain.",
      ],
      verdict: 'Not every council failure is financial. Some councils fail because the people running them cannot or will not run them properly.',
    },
    {
      type: 'councilEntry',
      rank: 10,
      name: 'Somerset Council: the near miss that proved the system is breaking',
      councilSlug: 'somerset',
      topLine: 'Financial emergency declared: late 2023. Section 114 narrowly avoided.',
      paragraphs: [
        "Somerset earns a place on this list not because it formally declared bankruptcy but because it came close enough to expose the fragility of the entire system.",
        'Towards the end of 2023, the newly created Somerset Council, formed from the merger of Somerset County Council and four district councils in April 2023, declared a financial emergency. Soaring costs and rising demand for services pushed the authority towards a Section 114 notice within months of its creation.',
        "The council avoided formal bankruptcy through emergency measures, spending cuts and government support. But the episode demonstrated something more alarming than a single council's failure. Somerset was a brand new authority, created specifically to be more efficient than the councils it replaced. If a council designed from scratch to solve the structural problems of local government can reach financial emergency within its first year, the argument that reorganisation alone fixes anything becomes considerably harder to sustain.",
        'By 2025, Somerset has stabilised but the underlying pressures, particularly in adult social care, remain. The council that was meant to prove the case for local government reform instead proved that the funding model is broken regardless of how councils are structured.',
      ],
      verdict: 'The council that nearly went bankrupt before it turned one. The strongest evidence that the crisis in local government is systemic, not the fault of individual councils alone.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What the ten cases tell us',
    },
    {
      type: 'paragraph',
      text: 'These ten councils failed for different reasons. Woking, Thurrock and Croydon gambled with public money on commercial investments. Birmingham and Nottingham deferred difficult decisions until deferral became catastrophe. Slough did not know its own financial position. Liverpool and Sandwell failed in governance rather than finance. Northamptonshire was too broken to reform and was abolished. Somerset nearly collapsed within months of being created.',
    },
    {
      type: 'paragraph',
      text: 'The common thread is not austerity alone, though funding cuts made every problem worse. Core local government funding fell by eighteen percent per person in real terms between 2010 and 2025. But the common thread is also that the systems designed to prevent failure did not work. External auditors did not catch problems early enough. Central government did not intervene until the damage was done. Elected members did not provide adequate scrutiny. Officers did not raise alarms loudly enough or were not heard when they did.',
    },
    {
      type: 'paragraph',
      text: 'In 2024/25, the government provided £1.4 billion in Exceptional Financial Support to eighteen councils. Analysis shared with ITV News in March 2024 suggested sixty three councils could declare bankruptcy within one year, rising to one hundred and twenty seven within five years. One in five council leaders surveyed by the Local Government Association said they expected to issue a Section 114 notice within two years.',
    },
    {
      type: 'paragraph',
      text: 'The ten councils on this list are not outliers. They are the visible failures in a system producing invisible ones every day. The question is no longer whether more councils will fail. It is how many, how soon, and whether anyone will act before they do.',
    },
  ],
};

export default piece;
