import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "j6axxkn4kr",
  kicker: 'Investigation',
  headline: "MoD Gave Palantir £240m Without a Contest. Again",
  standfirst: "The Ministry of Defence awarded Palantir a £240.6m data software contract without inviting rival bids, as it did in 2022 for less than a third of the price. It has refused to release the business case.",
  summary: "The MoD handed Palantir £240.6m without competition, its second uncontested deal running, and has withheld the business case behind it.",
  publishedAt: '2026-10-29',
  authorByline: "opengovt",
  body: [
    { type: 'paragraph', text: "The Ministry of Defence has awarded Palantir a £240.6 million contract for its data analytics software without inviting any other company to bid. It is the second time in a row. Palantir's previous enterprise agreement with the ministry, worth £75.2 million for three years from December 2022, was also awarded without being advertised. The new agreement runs for the same three years, from 1 April 2026 to 31 March 2029, and is worth more than three times as much." },
    { type: 'paragraph', text: "The ministry has refused to release the case for it. In March a member of the public asked under the Freedom of Information Act for the business case, the technical justification for the direct award and the Cabinet Office spending approval. On 2 April the ministry withheld all three, citing commercial interests, national security, defence and the formulation of government policy. The requester has asked for an internal review." },
    { type: 'paragraph', text: "Its public explanation is in a transparency notice published on 17 December 2025. The award was made under section 41 and paragraphs 6 and 7 of Schedule 5 of the Procurement Act 2023, which allow a direct award where there is an \"absence of competition for technical reasons\", or for \"existing services where a change of supplier would result in disproportionate technical difficulties\". The notice says only Palantir can license the data architecture the ministry uses and has the expertise to support it. It says switching would mean rebuilding that architecture, reaccrediting systems to the required security levels and retraining staff, at significant cost, with disruption to military operations and to interoperability with NATO allies. The software supports strategic, tactical and live operational decisions." },
    { type: 'paragraph', text: "The decision was the Secretary of State for Defence's, the defence minister Luke Pollard told Parliament on 17 February, answering the Liberal Democrat MP Martin Wrigley. When the contract was signed on 30 December 2025 that was John Healey, who has been Chancellor since 20 July 2026. Pollard said no ministers or former officials with prior links to Palantir were involved. Wes Streeting, Defence Secretary since 20 July 2026, is now responsible for the contract." },
    { type: 'paragraph', text: "In June the Commons Science, Innovation and Technology Committee, chaired by Dame Chi Onwurah, said that of the few technology providers the public sector relies on, \"Palantir concerns us most\", and that its increasing presence \"represents an unacceptable point of weakness\". The committee said this view was not driven by concerns about the quality of Palantir's products. It urged the government to use the February 2027 break clause in Palantir's NHS data platform contract, and asked it to explain why the £240 million defence contract had not been competed." },
    { type: 'paragraph', text: "The government's reply, received on 7 September and published on 22 October, said the award reflected \"the need to sustain existing services and maintain continuity of critical Defence capabilities\", drawing on \"the established integration of Palantir services within Defence systems\". It said the award followed a \"rigorous assessment of value for money, operational effectiveness, legal compliance, security, and ethical considerations\". It did not say which alternatives were considered, what switching would cost, or why the price had more than tripled." },
    { type: 'paragraph', text: "The ministry's case for a direct award rests on how deeply Palantir's software is now built into defence systems, the dependence the committee warned about. The government told the committee it would reduce lock in through a digital sourcing strategy that would \"expect robust exit strategies and data portability provisions to be built into contracts\". It rejected targets for supplier diversity, saying procurement law does not allow the government to \"pre-determine outcomes by setting quotas or targets for particular types or numbers of suppliers\"." },
    { type: 'paragraph', text: "None of this shows the award was unlawful. The Act permits direct awards where its conditions are met, and replacing software used in live operations carries real risks. The published notices also leave a gap: the 2022 agreement ended on 30 November 2025 and the new one began on 1 April 2026, and neither says what covered the four months between." },
    { type: 'paragraph', text: "The contract notice says a redacted copy of the contract can be made available on request 90 days after the award, a date that passed at the end of March. The business case, the technical justification and the spending approval remain withheld." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "Open Govt, John Healey", url: "https://www.opengovt.uk/mps/400" },
      { text: "Open Govt, Luke Pollard", url: "https://www.opengovt.uk/mps/4682" },
      { text: "Open Govt, Wes Streeting", url: "https://www.opengovt.uk/mps/4504" },
      { text: "MoD transparency notice, Palantir Enterprise Agreement, 17 Dec 2025", url: "https://www.find-tender.service.gov.uk/Notice/083858-2025" },
      { text: "MoD contract details notice, 23 Jan 2026", url: "https://www.find-tender.service.gov.uk/Notice/006344-2026" },
      { text: "MoD contract award, Palantir Enterprise Agreement, 2022", url: "https://www.contractsfinder.service.gov.uk/Notice/ac82a048-4e00-46f0-8a8f-be81beeddcca" },
      { text: "Written question 111951, 17 Feb 2026", url: "https://questions-statements.parliament.uk/written-questions/detail/2026-02-09/111951/" },
      { text: "Science, Innovation and Technology Committee, Rewiring the state, HC 61, 3 Jun 2026", url: "https://committees.parliament.uk/publications/53352/documents/298462/default/" },
      { text: "Government response, Rewiring the state, 22 Oct 2026", url: "https://publications.parliament.uk/pa/cm5902/cmselect/cmsctech/651/report.html" },
      { text: "MoD FOI response FOI2026/05330, 2 Apr 2026", url: "https://www.whatdotheyknow.com/request/agreement_awarded_to_palantir_te" },
    ],
    lastChecked: '2026-10-29',
  },
  relatedDeptSlugs: ['defence'],
  relatedMemberIds: [400, 4682, 4504],
};

export default piece;
