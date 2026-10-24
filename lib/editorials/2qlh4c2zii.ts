import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "2qlh4c2zii",
  kicker: 'Investigation',
  headline: "DWP Algorithm Flags Foreign Claimants Three Times as Often",
  standfirst: "The Department for Work and Pensions promised in July 2025 to retrain its Universal Credit fraud algorithm after finding it flagged some groups more often without finding more fraud. A year later the gap had widened, and the retrained model was still not in use.",
  summary: "DWP's algorithm flags foreign nationals for fraud checks 3.35 times as often, without more refusals. A promised retrained model is not live.",
  publishedAt: '2026-10-24',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: "In July 2025 the Department for Work and Pensions found that its machine learning model for Universal Credit advances flagged claimants who are not UK nationals for fraud checks 2.27 times as often as UK nationals, while referred cases from both groups were refused at the same rate. \"This warrants further action, and we will retrain the model,\" the department wrote. [Liz Kendall](/mps/4026) was Work and Pensions Secretary at the time." },
    { type: 'paragraph', text: "Its next assessment, published on 9 July 2026 under [Pat McFadden](/mps/1587), Work and Pensions Secretary since September 2025, found the referral ratio for foreign nationals had risen to 3.35. Once referred, their advances were 1.04 times as likely to be refused, a difference that was not statistically significant. The department said this \"indicates the model is not working as effectively as it could for this cohort\". The model had been retrained, but \"further testing is required ahead of the retrained model going live\". No date was given. The department concluded it was \"reasonable and proportionate\" to keep the existing model running, with \"minimal concerns about effectiveness, unfair treatment or detrimental impact on legitimate claimants\"." },
    { type: 'paragraph', text: "The two years cover different periods, and the figures do not show what caused the rise. They do show that the gap the department said needed fixing was still there, and larger, a year later." },
    { type: 'paragraph', text: "Advances help new Universal Credit claimants who need money before their first payment. In 2025/26 the department paid 1.3 million advances worth £700 million and estimated fraud and error on them at between £20 million and £90 million. The model picks out requests it rates as high risk and sends them, mixed with randomly selected control cases, to a member of staff, who decides whether to pay. Staff are not shown a risk score or told the referral came from the model. A refused advance does not automatically mean the Universal Credit claim itself is refused." },
    { type: 'paragraph', text: "The department counts a referral as \"correct\" when the member of staff refuses the advance. On that measure the model is 2.5 times more effective than random selection, and the department argues that targeting means fewer legitimate claimants are checked than random checks would require." },
    { type: 'paragraph', text: "The same measure shows other groups being checked more without a matching rise in refusals. Claimants aged 55 to 65 were referred 1.36 times as often as those aged 25 to 34, but their referred advances were only 0.58 times as likely to be refused. For those aged 66 and over the figures were 27.24 and 0.36, although that group made up only 0.1 per cent of cases. Couples were referred at about the same rate as single claimants but were 0.36 times as likely to be refused. The department suggested such patterns may arise from \"fraudsters misrepresenting their circumstances\" and because fraud risk \"is not evenly distributed across all claim types\"." },
    { type: 'paragraph', text: "The assessment covered only two protected characteristics, age and nationality, because the department found no adequate data for the others, including disability. It said reported illness and couple status \"cannot be used as an approximation\" for any protected characteristic." },
    { type: 'paragraph', text: "For most legitimate claimants the delay is short. Advances not checked by any fraud control were paid with a median delay of zero days; those flagged by the model and then approved took a median of one day, the same as other fraud checks. The department has not published the longest delays or how they are spread between groups." },
    { type: 'paragraph', text: "In written evidence to the Public Accounts Committee in November 2025, the legal charity Public Law Project said the 2025 assessment was inadequate to support the department's conclusion of \"minimal concerns\". It noted the department had not published the model's overall accuracy, any minimum accuracy it requires for each group, or the spread of payment delays, and that the model had been about half as accurate for applicants reporting an illness. These are the charity's arguments, not findings by a court or regulator." },
    { type: 'paragraph', text: "The model is run by the department's Integrated Risk and Intelligence Service, whose head is the senior responsible owner. The department says it will assess the retrained model \"once the retrained model has been deployed and sufficient data is collected\". It has given no date for either." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "Open Govt, Pat McFadden", url: "https://opengovt.uk/mps/1587" },
      { text: "Open Govt, Liz Kendall", url: "https://opengovt.uk/mps/4026" },
      { text: "DWP, Advances model effectiveness assessment, 9 Jul 2026", url: "https://www.gov.uk/government/publications/effectiveness-assessment-including-statistical-analysis-of-the-universal-credit-advances-machine-learning-model-1-april-2025-to-31-march-2026/effectiveness-assessment-of-universal-credit-advances-model" },
      { text: "DWP, Advances model fairness assessment, 17 Jul 2025", url: "https://www.gov.uk/government/publications/fairness-assessment-including-statistical-analysis-of-the-universal-credit-advances-machine-learning-model-1-april-2024-to-31-march-2025/universal-credit-advances-model-fairness-assessment" },
      { text: "DWP, Advances model algorithmic transparency record, 16 Dec 2025", url: "https://www.gov.uk/algorithmic-transparency-records/dwp-universal-credit-advances-model" },
      { text: "Public Law Project, Written evidence FAE0006, Nov 2025", url: "https://committees.parliament.uk/writtenevidence/152681/pdf/" },
    ],
    lastChecked: '24 October 2026',
  },
  relatedDeptSlugs: ['work-pensions'],
  relatedMemberIds: [1587, 4026],
};

export default piece;
