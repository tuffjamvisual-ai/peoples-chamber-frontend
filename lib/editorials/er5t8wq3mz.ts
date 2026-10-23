import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "er5t8wq3mz",
  kicker: 'Investigation',
  headline: "1.3 Million NHS Referral Entries Vanished From Worklists in Six Months. The National Safety Log Never Mentioned the Risk",
  standfirst:
    "The NHS e-Referral Service, supplied by NHS England, automatically removed more than 1.3 million entries from hospital worklists between February and July 2026, after 180 days without recorded action and with no warning. Entries \"just disappear\", the Health Services Safety Investigations Body (HSSIB) reported on 22 October. The national hazard log, which is meant to record every clinical risk in the system, made no mention of the function.",
  summary: "NHS England’s referral system removed 1.3 million worklist entries in six months. Its safety log never mentioned the risk.",
  publishedAt: '2026-10-23',
  authorByline: "opengovt",
  body: [
    { type: 'paragraph', text: "Over those six months the service handled 12.4 million referrals and requests for specialist advice. Of the 1.3 million entries removed, 127,450 came from inbound worklists: new referrals, requests for advice and referrals waiting for an appointment slot. National data could not show whether any of those had been reviewed before they vanished. NHS England said the other 90 per cent were likely to have had some local processing. Worklist entries are not the same as individual patients." },
    { type: 'paragraph', text: "Investigators found four serious incident reports linked to the function since 2018. In 2018, 72 referrals \"disappeared from booking teams’ view\". In 2019, more than 1,000 patients potentially dropped off a worklist. In 2023/24, around 1,000 patients had to be added back after six months without a booking because clinics had no capacity. The incidents recorded no harm or no known harm, but providers told investigators harm may go unrecognised: prolonged symptoms, or more invasive treatment than would otherwise have been needed. The investigation also heard of psychological harm to patients." },
    { type: 'paragraph', text: "The 180 day function dates from 2004 and the Choose and Book system, and was carried over when the e-Referral Service replaced it in 2015. It exists to stop large worklists slowing the national system. NHS England told investigators that extending it is not technically feasible, because the service was not designed for the volume of outstanding referrals now in the NHS. Between 2019 and 2025, referrals through the service rose by around 40 per cent, and referrals on worklists used when no appointment slot is available rose by around 60 per cent." },
    { type: 'paragraph', text: "As supplier, NHS England is required under the national clinical safety standard DCB0129 to identify hazards and make its safety case and hazard log available to the organisations that use the system. HSSIB examined version 1.3 of the hazard log, dated January 2024, and found no reference to the 180 day function. NHS England confirmed the live version did not include it either. Investigators could not fully establish why." },
    { type: 'paragraph', text: "NHS England told investigators that managing the risk of disappearing referrals is the job of local providers, under the separate standard DCB0160. None of the providers HSSIB engaged with could show that they met that standard for the e-Referral Service. Some had no clinical safety officer responsible for it, because they regarded it as a national product. Several did not know about the 180 day hazard, or could not say whether their procedures controlled it." },
    { type: 'paragraph', text: "Since June 2020 providers have been able to download a weekly report, known as EBSX12, listing referrals that have dropped off worklists. NHS England advises them to use it, but does not monitor whether they do." },
    { type: 'paragraph', text: "NHS England’s only safety action is to rewrite its hazard log and clinical risk documentation to recognise the 180 day function. HSSIB’s report gives no completion date for it. NHS England also plans capital funding for 20 integrations between the e-Referral Service and hospital patient record systems in 2026/27." },
    { type: 'paragraph', text: "The body responsible for that work is itself being abolished. Under the Health Bill, NHS England is to be merged into the Department of Health and Social Care, with April 2027 the target date. In October officials were reported to believe that date would slip unless decisions on future national structures were made within days." },
    { type: 'paragraph', text: "HSSIB’s investigation is due to conclude in early 2027. Its August interim report recommended that NHS England and the department rapidly evaluate GP advice and guidance services, which run through the same system, before they are expanded further. No response to that recommendation has been published." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "HSSIB, risk of losing patient referrals, 22 Oct 2026", url: "https://www.hssib.org.uk/patient-safety-investigations/electronic-patient-record-systems-electronic-referrals-for-ongoing-care/second-interim-report/" },
      { text: "HSSIB, electronic referrals investigation, recommendations and safety actions", url: "https://www.hssib.org.uk/patient-safety-investigations/electronic-patient-record-systems-electronic-referrals-for-ongoing-care/" },
      { text: "Patient Safety Learning, NHS England merger timetable, 2026", url: "https://www.pslhub.org/news/dhsc-nhse-merger-timetable-revealed-r9392/" },
      { text: "Nuffield Trust, what the Health Bill does, May 2026", url: "https://www.nuffieldtrust.org.uk/resource/whats-in-the-new-health-bill" },
    ],
    lastChecked: '2026-10-23',
  },
  relatedDeptSlugs: ["health"],
};

export default piece;
