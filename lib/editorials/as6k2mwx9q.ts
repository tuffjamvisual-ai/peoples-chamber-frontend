import type { EditorialEntry } from './types';

// Briefing: the asylum system's cost and the enforcement gap. Rewritten and
// re-verified 2026-07-09 against real sources this session: £4.9bn asylum spend
// 2024/25 (Home Office + MoJ) incl. ~£2.7bn Home Office accommodation, and ~100,600
// claims in the year to December 2025 (exact 100,625, more than double 2019) per the
// PAC/NAO report and GOV.UK immigration statistics; PAC "severe pressure" warning;
// the 55 per cent figure is the Home Office analysis of refusals under the new
// Article 8 restrictions; Stoke Heath (Shropshire) accommodation row confirmed.
const piece: EditorialEntry = {
  slug: 'as6k2mwx9q',
  kicker: 'Immigration and Money',
  headline: '£4.9bn Asylum Bill and Still No Control',
  standfirst:
    'Britain’s asylum system is costing taxpayers £4.9 billion a year and still does not work.',
  publishedAt: '2026-07-14',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'Parliament’s Public Accounts Committee has warned that the system is under severe pressure. In 2024/25, the Home Office and Ministry of Justice spent around £4.9 billion on asylum. The Home Office spent around £2.7 billion on accommodation alone.' },
    { type: 'paragraph', text: 'Around 100,600 people claimed asylum in the year ending December 2025. That is more than double the figure in the year ending December 2019.' },
    { type: 'paragraph', text: 'Every delayed decision costs money. Unresolved claims need beds. Hotel bookings turn into local rows. And each failed removal feeds the belief that the Home Office has lost its grip.' },
    { type: 'paragraph', text: 'Ministers keep promising control. The figures tell a different story.' },
    { type: 'paragraph', text: 'People claim asylum. Cases drag on. Accommodation bills rise. Communities are told to accept placements they had no say over. Councils are left dealing with the fallout. Then ministers stand up and promise to fix the same mess all over again.' },
    { type: 'paragraph', text: 'Stoke Heath showed how national failure lands locally. An asylum accommodation decision can change a community almost overnight, with residents left asking why they were not properly warned, consulted or listened to.' },
    { type: 'paragraph', text: 'The policy contradiction is not subtle. Ministers can tighten the rules and increase refusals, but refusal does not mean removal. Home Office analysis suggests 55 per cent of those refused under the new restrictions may still remain in the UK because removal is not possible or is not carried out.' },
    { type: 'paragraph', text: 'So what does the public actually get?' },
    { type: 'paragraph', text: 'A bigger bill. A jammed system. More pressure on local areas. More tough talk from ministers. Less evidence that anyone is in control.' },
    { type: 'paragraph', text: 'The government gets the headline. Taxpayers get the invoice.' },
    { type: 'paragraph', text: 'At £4.9 billion a year, this is not control. It is failure with a price tag.' },
  ],
};

export default piece;
