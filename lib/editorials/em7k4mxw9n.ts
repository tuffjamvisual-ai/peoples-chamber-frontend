import type { EditorialEntry } from './types';

// Briefing on the NAO report "Electronic monitoring: improving resilience to meet
// increasing demand" (published July 2026). Rewritten 2026-08-01 to the author's
// newer version; fact-checked against real sources this session: 8,900 cases under
// review = ~24% of those recorded as requiring a tag; Serco took over May 2024,
// backlog peaked ~7,000 (Oct 2024) then <400 (Nov 2024); Feb 2026 Serco met the
// 95% timeliness target but fitted a tag on only 62% of individuals within its two
// attempts; 29-53hr breach-reporting window; ~half of alerts with an outcome ended
// with no further action; EM population 13,400 (Jan 2021) -> 28,700 (Mar 2026);
// MoJ estimate up to 22,000 more/year from 2027; up to £175m over 2026-29;
// proximity tags for domestic abusers; ~2,200 probation staff short. NAO source
// cited as plain text (no offsite link, per house rule).
const piece: EditorialEntry = {
  slug: 'em7k4mxw9n',
  kicker: 'Prisons and Probation',
  headline: 'Government Does Not Know How Many Offenders Are Going Without Electronic Tags',
  standfirst:
    'Thousands of offenders who should have been electronically monitored were caught in a mess of missing tags, disconnected equipment and inaccurate records.',
  publishedAt: '2026-08-02',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'By March 2026, officials were checking 8,900 cases, covering almost one in four people recorded as requiring a tag. Some cases may simply have been left open by mistake. Other people had never been tagged.' },
    { type: 'paragraph', text: 'The Ministry of Justice could not give a firm total for either group.' },
    { type: 'paragraph', text: 'This is the service ministers intend to expand as they try to ease overcrowding in prisons.' },
    { type: 'paragraph', text: 'The National Audit Office found delays in fitting tags and reporting possible breaches. It said the problems were wasting public money and putting public protection at risk.' },
    { type: 'paragraph', text: 'Serco took over responsibility for fitting tags and monitoring offenders in May 2024. Within months, the number of outstanding visits to fit, inspect or remove equipment had climbed to 7,000.' },
    { type: 'paragraph', text: 'By November 2024, the backlog had fallen below 400. That did not mean everyone was getting a tag.' },
    { type: 'paragraph', text: 'Serco recorded 95 per cent of fitting visits as being made on time in February 2026. But after two visits, only 62 per cent had ended with a tag being fitted.' },
    { type: 'paragraph', text: 'There could be another long wait when a possible breach occurred. Under the contract, Serco has between 29 and 53 hours to send the details to officials.' },
    { type: 'paragraph', text: 'Police and probation teams then have to deal with it. They were not always given enough information and did not always have enough staff to respond quickly.' },
    { type: 'paragraph', text: 'Nearly half the alerts with a recorded outcome ended without further action. During visits, auditors saw serious and minor breaches being dealt with in much the same way.' },
    { type: 'paragraph', text: 'Ministers are pressing ahead with a much bigger tagging programme.' },
    { type: 'paragraph', text: 'There were about 13,400 people under electronic monitoring in January 2021. By March 2026, the total had reached 28,700.' },
    { type: 'paragraph', text: 'The government expects to add as many as 22,000 people a year from 2027. It has put aside up to £175 million for the expansion over three years.' },
    { type: 'paragraph', text: 'Some of that money will support trials involving domestic abusers. A proximity tag is supposed to warn the authorities when an offender gets too close to the victim.' },
    { type: 'paragraph', text: 'That warning offers little protection if the equipment has not been fitted or nobody is available to respond. Probation services were already about 2,200 staff short in March.' },
    { type: 'paragraph', text: 'Tagging allows offenders to remain under restrictions after leaving prison. For victims, it may also appear to offer protection that the authorities cannot always provide.' },
    { type: 'paragraph', text: 'The government has yet to publish a reliable total for people going without a tag when they should have one. It has not shown that police and probation teams can cope with the extra work either.' },
    { type: 'paragraph', text: 'Despite that, another 22,000 cases a year are being planned.' },
    { type: 'paragraph', text: 'Source: National Audit Office, “Electronic monitoring: improving resilience to meet increasing demand”, 10 July 2026.' },
  ],
  evidence: {
    recordsReviewed: [
      'National Audit Office, "Electronic monitoring: improving resilience to meet increasing demand", 10 July 2026',
      'Electronic Monitoring Statistics Publication, England and Wales: March 2026 (Ministry of Justice)',
    ],
    lastChecked: '2026-08-01',
  },
};

export default piece;
