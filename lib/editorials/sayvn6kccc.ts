import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "sayvn6kccc",
  kicker: 'Investigation',
  headline: "DWP Uses AI to Read Claimants' Post. Won't Say What It Cost",
  standfirst: "The Department for Work and Pensions uses AI to screen around 25,000 claimants' letters a day. Its cost is withheld for \"commercial sensitivity\", and the department says its impact is hard to quantify.",
  summary: "DWP's AI screens 25,000 claimants' letters a day; its cost is withheld and DWP says its impact is hard to quantify.",
  publishedAt: '2026-10-29',
  authorByline: "opengovt",
  body: [
    { type: 'paragraph', text: "The Department for Work and Pensions uses artificial intelligence to read around 25,000 letters from claimants every day, picking out people who may be vulnerable and need urgent help. Its funding is listed in a National Audit Office report published on 21 October as \"Not disclosed due to commercial sensitivity\". The department also told the NAO that the scanner's impact was hard to quantify, because that \"would require a robust counterfactual showing what would have happened\" without it." },
    { type: 'paragraph', text: "The Whitemail Insights and Vulnerability Scanner was deployed in Personal Independence Payment in December 2023, extended to Employment and Support Allowance in April 2024 and moved into routine use in April 2025. By September 2026 it had prompted more than 1,500 interventions. DWP estimates that screening the same post by hand would have needed almost 300 more full time staff. The NAO found qualitative case evidence that earlier identification allowed more timely support, and that in some cases this may have reduced the risk of significant harm. It said it had not been possible to determine with certainty whether intervention prevented more serious outcomes." },
    { type: 'paragraph', text: "A 2024 Government Internal Audit Agency report on the scanner found \"inadequate communication and sharing of lessons\", which the NAO said potentially led to missed opportunities to improve other AI projects in the department. The NAO also heard that teams tended to share successes rather than projects that failed or were dropped." },
    { type: 'paragraph', text: "The department's machine learning model in the Child Maintenance Service predicts which cases are at risk of payments breaking down so caseworkers can step in. It cost £625,000 to develop between September 2023 and March 2024 and costs around £460,000 a year to run from 2024/25. DWP estimates it has stopped an additional 715 cases a month falling into arrears and saved the equivalent time of 49 full time staff. Both figures rest on its test and learn approach and staff feedback. A full evaluation is planned only after more data is added to the model in late 2027." },
    { type: 'paragraph', text: "The Generative AI in Learning tool, GAIL, writes staff training material. Its proof of concept was funded with £428,000 through the department's Lighthouse Programme, and it was developed with commercial partners including IBM. DWP's Investment Committee then awarded £10 million for \"various digital and AI activities, including GAIL\", to turn it into a permanent service. The NAO said the committee \"agreed the level of uncertainty around costs and benefits that it was willing to accept\", and that the team accepted the tool's value \"could not be fully proven upfront\". Early testing found tasks that took days or weeks could be done in minutes. DWP has not completed a long term evaluation and says it plans one." },
    { type: 'paragraph', text: "The department deliberately set a higher appetite for risk on GAIL and on a new benefits administration programme, which received £4 million for a proof of solution between October 2025 and March 2026 and £10 million in 2026/27 to assess whether the service is feasible. HM Treasury's Magenta Book, updated in May 2026, describes test and learn as \"complementary to, but not a substitute for, formal evaluation\"." },
    { type: 'paragraph', text: "One trial shows what happens when evaluation is not designed in. In 2024 DWP texted more than 3,500 Carer's Allowance claimants to prompt them to report changes in circumstances. Around 70 per cent of the 13,800 cases it reviewed were unsuitable, for example because contact details were missing. A second pilot of around 4,500 claimants in 2025 was delayed by problems extracting data from legacy systems, so the texts went out alongside the annual uprating letter, which carries the same reminder. DWP could not isolate the effect of the texts, the evaluation found no significant change, and the department dropped the scheme in July 2025." },
    { type: 'paragraph', text: "DWP administers benefits and pensions for around 23 million people and spent £309.5 billion on welfare payments and £10.6 billion on running its services in 2025/26. Pat McFadden has been Work and Pensions Secretary since 5 September 2025. The NAO reported that the Secretary of State wants the department to be \"a driver of innovation, experimentation and learning\". In the 2025 Civil Service People Survey, 67 per cent of DWP staff felt they would be supported to try a new idea even if it might not work, against a civil service average of 70 per cent." },
    { type: 'paragraph', text: "The NAO concluded that DWP was \"experimenting in valuable ways\", with \"indications of positive impact on customer service and productivity\", and that it had many of the building blocks for effective innovation, including stopping projects that do not work. It recommended that the department plan evaluation into every project from the start, involve analysts early, use long term evaluation alongside testing, and share lessons from failures as well as successes. The audit did not examine every AI system DWP uses. Open Govt reported on 24 October that its Universal Credit fraud model flags some groups more often without finding more fraud, and that the retrained model promised in July 2025 was still not in use." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "Open Govt, DWP algorithm flags foreign claimants three times as often, 24 Oct 2026", url: "https://www.opengovt.uk/editorials/2qlh4c2zii" },
      { text: "Open Govt, Pat McFadden", url: "https://www.opengovt.uk/mps/1587" },
      { text: "National Audit Office, DWP's approach to innovation, HC 616, 21 Oct 2026", url: "https://www.nao.org.uk/wp-content/uploads/2026/10/dwps-approach-to-innovation.pdf" },
      { text: "National Audit Office, DWP's approach to innovation, report page, 21 Oct 2026", url: "https://www.nao.org.uk/reports/dwps-approach-to-innovation/" },
    ],
    lastChecked: '2026-10-29',
  },
  relatedDeptSlugs: ['work-pensions'],
  relatedMemberIds: [1587],
};

export default piece;
