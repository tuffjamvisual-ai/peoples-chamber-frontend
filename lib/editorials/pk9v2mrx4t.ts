import type { EditorialEntry } from './types';

// Briefing on the MoJ 2024-25 accounts "constructive loss" of £23,996,152 on three
// cancelled prison capacity projects. Fact-checked 2026-08-02 against real sources
// this session: the ~£24m loss on cancelled/scaled-back prison projects is confirmed
// (Construction News, 2 Dec 2025; three builds declared "unachievable", Aug 2025);
// MoJ attributed it to rising build costs, more asbestos than expected and supplier
// failure; part of the prison capacity programme (20,000 places pledged Oct 2021 by
// the mid-2020s); by Sept 2024 only 6,518 delivered, last places not until 2031; NAO
// (Dec 2024) puts the portfolio at £9.4bn-£10.1bn. CORRECTION: draft said the
// programme was "originally priced at £7.1 billion" — NAO says approved funding was
// £5.2bn at the 2021 spending review (increase of £4.2bn-£4.9bn / 80-93%); changed to
// £5.2bn. NAO + MoJ accounts cited as plain text (no offsite link, per house rule).
const piece: EditorialEntry = {
  slug: 'pk9v2mrx4t',
  kicker: 'Prisons and Probation',
  headline: 'Three Prison Projects Cancelled After Almost £24m Was Spent',
  standfirst:
    'Construction had started at all three prisons before the Ministry of Justice judged them too expensive to finish. Its accounts give no names, no locations and almost no detail.',
  publishedAt: '2026-08-03',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'Three schemes to create more prison space were abandoned after the Ministry of Justice had spent almost £24 million on them.' },
    { type: 'paragraph', text: 'Construction had started at all three prisons. The work was later judged too expensive to complete.' },
    { type: 'paragraph', text: 'The department recorded a loss of £23,996,152 in its accounts for the year ending March 2025. It said building costs had risen, more asbestos had been found than expected and a supplier had failed.' },
    { type: 'paragraph', text: 'No names were given for the prisons or the supplier.' },
    { type: 'paragraph', text: 'It is not possible to tell from the accounts whether one project accounted for most of the loss or whether the money was spread evenly between the three. They contain no separate costs and give no details of what had been built before work stopped.' },
    { type: 'paragraph', text: 'The projects were part of the prison capacity programme. Each involved construction at a jail already in use, rather than one of the new prisons planned by the government.' },
    { type: 'paragraph', text: 'The £23,996,152 appears in the accounts as a “constructive loss”. Officials had decided that putting more money into the three schemes was not worthwhile.' },
    { type: 'paragraph', text: 'Bills continued after the end of March. Contractors left the sites and the Ministry paid for remedial work.' },
    { type: 'paragraph', text: 'None of that later spending is included in the £24 million. It will be reported in the accounts for 2025/26.' },
    { type: 'paragraph', text: 'The Ministry has already given an indication of its size. Further losses, it said, would probably be “of a similar order”.' },
    { type: 'paragraph', text: 'This happened during a rush to find more prison cells. The government had announced that 20,000 additional places would be provided by the mid-2020s, but the building programme fell years behind.' },
    { type: 'paragraph', text: 'By March 2025, only about 6,400 of those places were expected to be ready. The rest were not due to arrive until 2031.' },
    { type: 'paragraph', text: 'The National Audit Office put the likely cost of the programme at between £9.4 billion and £10.1 billion. It had originally been budgeted at £5.2 billion at the 2021 spending review.' },
    { type: 'paragraph', text: 'According to the auditors, ministers announced the 20,000 places before all the money had been secured. Planning took longer than expected and inflation made construction more expensive.' },
    { type: 'paragraph', text: 'Where the three cancelled schemes fitted into the programme cannot be seen from the published material. The short note in the accounts is the only information the Ministry provides about them.' },
    { type: 'paragraph', text: 'There are no dates for when the projects were approved or when builders entered the sites. The accounts do not say whether asbestos was found at one prison or several. They also give no clue about the supplier’s failure: when it happened, what contract was affected or how much it cost.' },
    { type: 'paragraph', text: 'The planned number of cells is absent. So are the original budgets and the revised prices which persuaded the Ministry to stop.' },
    { type: 'paragraph', text: 'It may be that detailed surveys were carried out and failed to find the full extent of the asbestos. It may be that the supplier collapsed without warning. The accounts do not provide enough information to know.' },
    { type: 'paragraph', text: 'What they do show is that construction was approved, work began and £23,996,152 was spent before the three projects were cancelled.' },
    { type: 'paragraph', text: 'Further money was then spent closing the sites. The amount will not be known until the next Ministry of Justice accounts are released.' },
    { type: 'paragraph', text: 'The accounts do not identify the locations.' },
    { type: 'paragraph', text: 'Sources: Ministry of Justice, Annual Report and Accounts 2024-25; National Audit Office, “Increasing the capacity of the prison estate to meet demand”, December 2024.' },
  ],
  evidence: {
    recordsReviewed: [
      'Ministry of Justice, Annual Report and Accounts 2024-25 (constructive loss of £23,996,152)',
      'National Audit Office, "Increasing the capacity of the prison estate to meet demand", December 2024',
    ],
    lastChecked: '2026-08-02',
  },
};

export default piece;
