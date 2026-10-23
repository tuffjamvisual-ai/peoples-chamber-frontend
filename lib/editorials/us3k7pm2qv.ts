import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "us3k7pm2qv",
  kicker: 'Investigation',
  headline: "Sussex NHS Trust Missed Its Savings Target by £12m. Now It Plans £140m More While Cutting 1,500 Posts",
  standfirst:
    "University Hospitals Sussex NHS Foundation Trust delivered £96.8 million of savings in 2025/26 against a plan of £109 million, falling £12.2 million short. For 2026/27 it plans an \"Efficiency Programme of £140m\" and a 5 per cent increase in treatment capacity, while UNISON says it is cutting more than 1,500 funded posts.",
  summary: "The Sussex trust missed last year’s savings by £12.2m. It now plans £140m more while UNISON says 1,500 posts go.",
  publishedAt: '2026-10-23',
  authorByline: "opengovt",
  body: [
    { type: 'paragraph', text: "The trust’s 2025/26 annual report says the new programme \"will focus largely on cost reduction\", including \"control of workforce numbers\". Elsewhere the same report puts the plan’s \"efficiency requirement\" at £128.61 million, to be updated once pay awards are settled. The trust submitted a breakeven plan to NHS England in March 2026, after reporting an adjusted surplus of £4.9 million for 2025/26." },
    { type: 'paragraph', text: "The 1,500 figure comes from UNISON’s April 2026 report, based on freedom of information requests to 202 NHS trusts and their published accounts. UNISON named University Hospitals Sussex as cutting \"more than 1,500 funded posts\", the largest of the trusts it named. It said posts were going through vacancy freezes, restructuring and less agency staffing, and that many trusts had not said where cuts would fall. Across England, UNISON’s campaign now puts the total at at least 26,000 posts by 2028, covering support, administrative, management and some clinical roles." },
    { type: 'paragraph', text: "Last year’s savings included £7.3 million in nursing pay from less agency use and better shift planning, £17.7 million in other pay, and £6.5 million from procurement. The trust says each scheme has an equality and quality impact assessment, drawn up by staff in the area and signed off by the division’s managing director before it starts, with a small number of higher risk schemes going to the chief medical officer and chief nurse. Neither the annual report nor UNISON’s figures show where the 1,500 posts fall or how they relate to the £140 million." },
    { type: 'paragraph', text: "The trust starts from waiting times well behind the rest of England. In March 2026, 55.1 per cent of its patients had been waiting under 18 weeks, the month the national interim target of 65 per cent was reached, according to the Health Foundation. The trust cut waits of over a year from 6,923 to 3,580 and waits of over 65 weeks to 52. Its waiting list fell 1.4 per cent, to 112,535." },
    { type: 'paragraph', text: "The trust’s referral systems have already been criticised. In April 2026 the coroner Joseph Turner sent a prevention of future deaths report to its chief executive, Dr Andy Heeps, after Paul Harries died of a ruptured aortic aneurysm while waiting for a vascular appointment. The coroner found that a GP’s urgent referral could be downgraded without the GP being told why, and that referrals relied on three hospital systems that are not fully integrated. The trust replied on 5 June. It said emergency department imaging reports are now reviewed for incidental findings, consultants have been trained on referral urgency categories, and referral categories are regularly audited. It has a database, reviewed weekly, for patients whose aneurysms reach the threshold for surgery, but said Mr Harries \"never met the threshold for treatment and hence would not have been included in this database.\" A system to tell GPs when patients miss investigations was still being developed for its vascular assessment unit, with a view to a pilot, alongside a new electronic patient record across the trust." },
    { type: 'paragraph', text: "On 22 October the Health Services Safety Investigations Body found that \"reduced administrative capacity, and unclear roles and responsibilities\" had contributed to patients being lost from NHS referral worklists. It also recorded providers’ concern that \"reductions in administrative staffing levels\" could weaken the checks that catch referrals removed from those lists. HSSIB did not examine University Hospitals Sussex’s plans." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "University Hospitals Sussex, annual report and accounts 2025/26", url: "https://www.uhsussex.nhs.uk/wp-content/uploads/2026/07/UHSussex-Annual-Report-Accounts-2025-26-FINAL.pdf" },
      { text: "UNISON, Less Fit for the Future, 13 Apr 2026", url: "https://unison.org.uk/press/2026/04/more-20000-nhs-posts-be-axed-over-ps11bn-budget-deficit" },
      { text: "UNISON, NHS cuts campaign", url: "https://unison.org.uk/campaigns/nhs-cuts" },
      { text: "Health Foundation, waiting times analysis, 8 Oct 2026", url: "https://www.health.org.uk/reports-and-analysis/analysis/two-years-down-three-to-go-is-progress-on-waiting-times-stalling" },
      { text: "Coroner’s report, Paul Harries, 20 Apr 2026", url: "https://www.judiciary.uk/prevention-of-future-death-reports/paul-harries-prevention-of-future-deaths-report/" },
      { text: "Trust response to the coroner, 5 Jun 2026", url: "https://www.judiciary.uk/wp-content/uploads/2026/06/2026-0242-Response-from-University-Hospitals-Sussex-NHS-Foundation-Trust-.pdf" },
      { text: "HSSIB, risk of losing patient referrals, 22 Oct 2026", url: "https://www.hssib.org.uk/patient-safety-investigations/electronic-patient-record-systems-electronic-referrals-for-ongoing-care/second-interim-report/" },
      { text: "University Hospitals Sussex, Dr Andy Heeps", url: "https://www.uhsussex.nhs.uk/people/dr-andy-heeps/" },
    ],
    lastChecked: '2026-10-23',
  },
  relatedDeptSlugs: ["health"],
};

export default piece;
