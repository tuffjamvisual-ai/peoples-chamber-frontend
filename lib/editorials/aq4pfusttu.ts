import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: 'aq4pfusttu',
  kicker: 'Public Spending',
  headline: `No Digital Spending Figures, but a £45bn Savings Claim`,
  standfirst: `The government has told MPs that annual figures for what the public sector spends on digital transformation are not currently feasible from its finance systems, and gave no date for changing that. The £45 billion a year it says digitising public services could save is a modelled estimate that MPs called “worryingly optimistic”.`,
  summary: "The government says it cannot yet publish its digital reform spending, but still promotes a £45bn savings figure MPs called “worryingly optimistic”.",
  publishedAt: '2026-10-22',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: `The government has told MPs that publishing annual figures for what departments and public bodies spend on digital transformation is not currently practicable. It said this was “not currently feasible through existing finance systems in a way that would provide consistent, reliable and comparable data across departments”, and that it would consider how it “could be developed over time”. It gave no date.` },
    { type: 'paragraph', text: `The admission came in its response to Rewiring the state: Delivering digital government, a report published on 3 June by what was then the [Commons Science, Innovation and Technology Committee](/committees/135). The committee had recommended that the Government Digital Service (GDS) require every department and public body to disclose its annual digital and data spending. The guidance would be drawn up with the Treasury, with input from the National Audit Office, and the figures published each year in the Treasury’s Public Expenditure Statistical Analyses.` },
    { type: 'paragraph', text: `The government said it “agrees with the intent” of the recommendation. In place of annual totals, it pointed to a cross government Digital pipeline, into which departments must report projects above “a £5 million whole-life cost threshold”, and said “approximately 90% of total digital spend is captured at this level”. It said high value contract spending remains public through contract award notices and Contracts Finder, and that departments already supply measures such as cost per transaction. It will publish cross government metrics through its digital roadmap, but “will not, at this stage, require departments and public bodies to publish separate annual reports”. None of those mechanisms produces the annual spending total the committee asked for.` },
    { type: 'paragraph', text: `The same government promotes an estimate that digitising public services could save more than £45 billion a year. That figure is modelled, not measured. In a letter to the committee on 10 April 2025, [Feryal Clark](/mps/4822), then a minister at the Department for Science, Innovation and Technology (DSIT), set out how the largest part, £36 billion, was calculated. The model assumed that “100% of routine tasks and 10% of non-routine tasks can be automated” in central government. It then scaled the result to a £240 billion public sector staff cost baseline, giving a range of £36 billion to £72 billion a year, and used the lower end. The methodology note says delivering these benefits “will necessitate substantial investments”, and that further work was needed with departments to “understand the cost of implementing these projects”.` },
    { type: 'paragraph', text: `The committee called the £45 billion estimate “worryingly optimistic”. It found that the government’s roadmap for digital government “lacks overarching metrics by which the success or failure of delivery” could be assessed.` },
    { type: 'paragraph', text: `The response was due by 3 August. On 13 July, [Ian Murray](/mps/3966), then the minister for digital government and data, asked the committee for more time “due to the formation of a new administration”, and the deadline moved to 1 September. The response was received on 7 September, six days after the extended deadline, and the committee published it on 22 October. DSIT itself was abolished in the reshuffle, and digital government moved to the Department for Digital, Culture, Media and Sport, where [Stephanie Peacock](/mps/4607) has been Minister for Sport, Tourism, Place and Digital Government since 22 July 2026.` },
    { type: 'paragraph', text: `[Dame Chi Onwurah](/mps/4124), who chairs what is now the Commons Science and Technology Committee, said the abolition of DSIT “has only highlighted concerns about who is responsible for driving digital transformation across government”. The committee said the government did not respond to its recommendation for a Government Chief Digital Officer at permanent secretary level, and did not explain how clear leadership would be established.` },
    { type: 'paragraph', text: `The NAO raised the same weakness in March 2023. It said government “needs stronger digital expertise and sustained support from senior departmental leaders”, found that only 4 per cent of civil servants were digital professionals, and warned that without that support “these latest efforts will peter out”.` },
    { type: 'paragraph', text: `The response does set a deadline elsewhere. The government promised an action plan by the end of 2026 to set up a taskforce for modernising legacy systems, and agreed to develop a strategy to reduce dependence on single suppliers. The annual spending figures MPs asked for have no date.` },
  ],
  evidence: {
    recordsReviewed: [
      { text: `Rewiring the state: Delivering digital government, 3 Jun 2026`, url: 'https://committees.parliament.uk/publications/53352/documents/298462/default/' },
      { text: `Committee statement on the government response, 22 Oct 2026`, url: 'https://committees.parliament.uk/committee/135/science-and-technology-committee-commons/news/218379/government-unable-to-say-how-much-it-spends-on-digital-transformation-committee-warns/' },
      { text: `Feryal Clark, methodology behind the £45bn estimate, 10 Apr 2025`, url: 'https://committees.parliament.uk/publications/47602/documents/248450/default/' },
      { text: `Ian Murray, letter on response deadline, 13 Jul 2026`, url: 'https://committees.parliament.uk/publications/54867/documents/304636/default/' },
      { text: `NAO, Digital transformation in government, 10 Mar 2023`, url: 'https://www.nao.org.uk/press-releases/digital-transformation-in-government-addressing-the-barriers/' },
      { text: `Government response, HC 651, 22 Oct 2026`, url: 'https://publications.parliament.uk/pa/cm5902/cmselect/cmsctech/651/report.html' },
    ],
    lastChecked: '2026-10-22',
  },
  relatedDeptSlugs: ['culture', 'treasury'],
  relatedMemberIds: [4822, 3966, 4607, 4124],
};

export default piece;
