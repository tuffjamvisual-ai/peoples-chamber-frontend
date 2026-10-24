import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "cp4w8xq2rn",
  kicker: 'Investigation',
  headline: "Capture Victims Must Clear Their Names Before Compensation",
  standfirst: "The Post Office knew its Capture software had bugs in the 1990s, and the government accepted in 2024 that it could have caused shortfalls. Postmasters convicted in Capture cases are still excluded from compensation unless the Court of Appeal quashes their convictions, and the Post Office is contesting the first two appeals.",
  summary: "Postmasters convicted in Capture cases get no compensation unless their convictions are quashed, and the Post Office is contesting the appeals.",
  publishedAt: '2026-10-24',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: "Postmasters convicted of offences connected to the Post Office's Capture software cannot apply for Capture compensation. The government's guidance says you cannot apply if \"you have a criminal conviction related to Capture\", and directs them to the Criminal Cases Review Commission. Only if the Court of Appeal overturns a conviction may redress become available." },
    { type: 'paragraph', text: "Postmasters who lost money without being convicted can apply directly to the Capture Redress Scheme, which opened on 29 October 2025." },

    { type: 'heading', level: 2, text: 'What the investigation found' },
    { type: 'paragraph', text: "Capture was accounting software the Post Office developed and used in some branches in the 1990s, before Horizon. It ran locally on branch computers and was not connected to a central network." },
    { type: 'paragraph', text: "Kroll, the forensic accountants appointed by the government, identified 46 bugs in surviving Post Office newsletters and circulars. It selected five for testing and reproduced three. It concluded there was a \"reasonable likelihood that Capture could have created shortfalls for postmasters\"." },
    { type: 'paragraph', text: "Kroll found no evidence that the Post Office's audit, investigation or legal teams considered known Capture bugs as a possible cause of shortfalls, and no evidence of an effective response to postmasters' concerns at the time. It could not test every version of Capture, could not say every bug caused shortfalls and made no findings on individual convictions." },
    { type: 'paragraph', text: "The government accepted the findings on 17 December 2024, in a response signed by the then Post Office minister, [Gareth Thomas](/mps/177). It noted \"very low levels of contemporaneous records and evidence\" from the period and committed to a redress scheme. It said the safety of convictions was for the courts, through the existing appeals process." },

    { type: 'heading', level: 2, text: 'Compensation so far' },
    { type: 'paragraph', text: "By 30 September 2026 the [Department for Business, Innovation, Science and Trade](/departments/business-trade) had received 311 complete applications. Of these, 157 were still being assessed for eligibility, 133 had been found eligible and 21 had been rejected. Of the 133 eligible claims, 94 had settled, meaning the claimant had accepted a final offer, 15 were considering offers and 24 were waiting for one. More than £9.3 million had been paid, including the £10,000 preliminary payment made on confirmation of eligibility." },
    { type: 'paragraph', text: "On 22 October 2026 the Post Office minister, [Kate Dearden](/mps/5224), announced that the Capture Redress Scheme will close to new applications on 31 March 2027, and an independent investigation into other software used before Horizon." },

    { type: 'heading', level: 2, text: 'The convictions' },
    { type: 'paragraph', text: "In January 2026 the justice minister [Alex Davies-Jones](/mps/4849) told the Business and Trade Committee that extending the Horizon legislation, which quashed qualifying convictions by Act of Parliament, to Capture would be \"quite the constitutional stretch\". More than 100 Horizon convictions had been overturned in court before Parliament acted, she said, while no Capture conviction had been. Asked what could change that, she said: \"Numbers or more evidence\". The Commission was then assessing 35 Capture cases." },
    { type: 'paragraph', text: "Two Capture convictions have been referred to the Court of Appeal. In October 2025 the Commission referred the 1998 theft convictions of Patricia Owen, a former sub-postmistress who died in April 2003. Her family applied for a review in January 2024." },
    { type: 'paragraph', text: "In March 2026 it referred the conviction of Stephen Marston, sub-postmaster at Heap Bridge Post Office in Bury. After being pressed to adopt Capture in 1996, he faced unexplained shortfalls of £5,000 to £10,000, used about £23,000 of his savings to cover them and inflated figures to make his accounts balance. He pleaded guilty on legal advice to theft, false accounting and concealing valuable securities and was given a 12 month probation order. In both cases the Commission found a real possibility that the court would rule the prosecution an abuse of process." },
    { type: 'paragraph', text: "The Post Office is contesting both appeals. Its chair, Nigel Railton, told MPs in January that Capture convictions should be overturned by legislation, as Horizon convictions were. The Post Office says it accepts Capture's flaws made convictions relying on it unsafe, but that as the original prosecutor it must put legal and factual issues before the court. In April the Court of Appeal refused its request for two more months to respond in Marston's case." },
    { type: 'paragraph', text: "We found no published Court of Appeal judgment in either case as of 24 October 2026. By March 2026 the Commission had received 37 applications about software used before Horizon, with 25 still under review." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "Open Govt, Department for Business, Innovation, Science and Trade", url: "https://opengovt.uk/departments/business-trade" },
      { text: "Open Govt, Kate Dearden", url: "https://opengovt.uk/mps/5224" },
      { text: "Open Govt, Gareth Thomas", url: "https://opengovt.uk/mps/177" },
      { text: "Open Govt, Alex Davies-Jones", url: "https://opengovt.uk/mps/4849" },
      { text: "Government response to the Capture investigation, 17 Dec 2024", url: "https://www.gov.uk/government/publications/independent-investigation-into-capture-government-response/government-response-to-the-independent-investigation-into-the-capture-accounting-software" },
      { text: "GOV.UK, Apply to the Capture Redress Scheme", url: "https://www.gov.uk/guidance/apply-to-the-capture-redress-scheme" },
      { text: "DBIST, Capture redress data as of 30 Sep 2026", url: "https://www.gov.uk/government/publications/post-office-capture-financial-redress-data-for-2026/post-office-capture-financial-redress-data-as-of-30-september-2026" },
      { text: "DBIST, New action on redress for postmasters, 22 Oct 2026", url: "https://www.gov.uk/government/news/new-action-on-redress-for-postmasters-affected-by-post-office-scandals" },
      { text: "Business and Trade Committee, oral evidence, 6 Jan 2026", url: "https://committees.parliament.uk/oralevidence/16969/html/" },
      { text: "CCRC, first Capture conviction referred, Oct 2025", url: "https://ccrc.gov.uk/news/ccrc-refers-first-post-office-capture-conviction-to-the-court-of-appeal/" },
      { text: "CCRC, Stephen Marston decision, Mar 2026", url: "https://ccrc.gov.uk/decision/marston-stephen/" },
      { text: "CCRC, second Capture conviction referred, 27 Mar 2026", url: "https://ccrc.gov.uk/news/ccrc-refers-second-post-office-capture-conviction-because-of-real-possibility-the-prosecution-was-an-abuse-of-process/" },
      { text: "Computer Weekly, Court of Appeal rejects Post Office delay request, 28 Apr 2026", url: "https://www.computerweekly.com/news/366642366/Court-of-Appeal-rejects-Post-Office-Capture-case-delay-request" },
      { text: "Computer Weekly, Post Office to contest Capture appeals, 14 May 2026", url: "https://www.computerweekly.com/news/366642891/Post-Office-to-contest-Capture-conviction-appeal-despite-chairman-support-for-overturning-en-masse" },
      { text: "Law Gazette, Post Office contests Capture appeals", url: "https://www.lawgazette.co.uk/news/post-office-accused-of-shifting-responsibility-to-lawyers-on-new-appeals/5126959.article" },
    ],
    lastChecked: '24 October 2026',
  },
  relatedDeptSlugs: ['business-trade', 'justice'],
  relatedMemberIds: [5224, 177, 4849],
};

export default piece;
