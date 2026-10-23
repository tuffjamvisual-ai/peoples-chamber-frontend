import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: "in6v2kq8wr",
  kicker: 'Investigation',
  headline: "Patients Died Without the Help They Needed to Take Insulin. The NHS Fix Won't Arrive Until 2028",
  standfirst:
    "NHS England plans to publish national guidance and an assessment tool to help people manage insulin safely at home in March 2028. That is 22 months after the Health Services Safety Investigations Body recommended them in a report describing incidents in which failures of support had contributed to deaths.",
  summary: "Investigators linked insulin support failures to patient deaths. NHS England plans to publish the national fix in March 2028.",
  publishedAt: '2026-10-23',
  authorByline: "opengovt",
  body: [
    { type: 'paragraph', text: "HSSIB’s May report looked at people with diabetes in the community who have a disability. It found they were at risk of harm when an existing or new impairment was not recognised or adjusted for. The effects of the incidents it reviewed included complications, \"some of which had contributed to patient deaths\". One patient with type 1 diabetes, already under the care of services for eye, heart and foot complications, \"died following admission to hospital with DKA\", diabetic ketoacidosis. A young adult recently diagnosed with type 1 diabetes did not have the support they needed when their living situation changed, and \"was later found to have died at home, potentially as a result of their diabetes management.\"" },
    { type: 'paragraph', text: "Investigators found that hospital admissions often revealed a change in a person’s circumstances that nobody had been monitoring. Failing eyesight, reduced dexterity, a new pen device or the loss of someone who helped could all leave a person unable to manage. \"There is no national competency framework for the management of insulin by patients and families,\" the report said. The only framework investigators found covered staff giving insulin on a patient’s behalf. Local checklists did not prompt staff to consider disability or adjustments. GP computer systems \"may not alert users when people have not requested repeat prescriptions of insulin.\"" },
    { type: 'paragraph', text: "HSSIB recommended that NHS England and the Department of Health and Social Care provide guidance for integrated care boards and community providers on services that help people manage insulin themselves, and develop a community tool to assess whether patients, families and carers can manage and administer insulin, taking account of disabilities and possible adjustments." },
    { type: 'paragraph', text: "NHS England responded on 14 July. Its community nursing team will set up a task and finish group by October 2026, collate existing good practice by June 2027, draft the guidance by October 2027 and test it with community providers by December 2027. The assessment tool will be developed and tested between October and December 2027. Both are due to be finalised and published in March 2028. The response gives no interim measures for patients in the meantime, and nothing has been published to show whether the October group has been set up." },
    { type: 'paragraph', text: "HSSIB’s August report, on people with a learning disability, described Ms H. She has type 2 diabetes and a learning disability, cannot read or write, and lives in a residential care home. With about 15 months of supervised training she learned to inject her own insulin. After her pen device changed, she did not remove the needle cap for an extended period and so was not receiving her medication. A practice nurse identified the problem when her blood sugar stayed high. She now uses a continuous glucose monitor that the nurse reviews remotely." },
    { type: 'paragraph', text: "The August report found that people with a learning disability had been harmed when they were not supported to manage insulin safely, and that incidents in primary and community care are likely to be underreported. Learning disabilities were often not recorded accurately in health records, specialist advice was hard for other staff to get, and insulin pens and diabetes technology were often not designed with this group in mind. Investigators also found services that had adapted education and supported people with a learning disability to use hybrid closed loop systems themselves." },
    { type: 'paragraph', text: "Other recommendations in the series have moved more slowly. Asked in February to develop a strategy for recognising type 1 diabetes with disordered eating and setting out care responsibilities, the Royal College of Psychiatrists said on 27 April that it supported the recommendation \"in principle\" but lacked capacity to do the work, and gave no date. NHS England, asked to improve collaboration between mental health teams and specialist diabetes services, said on 13 July that it would give its full response only once all the reports in the series are published. The National Institute for Health and Care Research has no published response to the two research recommendations addressed to it." },
  ],
  evidence: {
    recordsReviewed: [
      { text: "HSSIB, insulin investigation series and organisational responses", url: "https://www.hssib.org.uk/patient-safety-investigations/insulin-supporting-safe-self-administration-in-vulnerable-patient-groups-in-the-community/" },
      { text: "HSSIB, patients with a disability, 19 May 2026", url: "https://www.hssib.org.uk/patient-safety-investigations/insulin-supporting-safe-self-administration-in-vulnerable-patient-groups-in-the-community/second-investigation-report/" },
      { text: "HSSIB, patients with a learning disability, 13 Aug 2026", url: "https://www.hssib.org.uk/patient-safety-investigations/insulin-supporting-safe-self-administration-in-vulnerable-patient-groups-in-the-community/third-investigation-report/" },
      { text: "HSSIB, news release on the May report", url: "https://www.hssib.org.uk/news-events-blog/life-threatening-gaps-in-community-support-for-people-with-disabilities-managing-insulin/" },
      { text: "HSSIB, news release on the August report", url: "https://www.hssib.org.uk/news-events-blog/hssib-identifies-inequitable-support-for-people-with-a-learning-disability-to-safely-self-administer-insulin/" },
    ],
    lastChecked: '2026-10-23',
  },
  relatedDeptSlugs: ["health"],
};

export default piece;
