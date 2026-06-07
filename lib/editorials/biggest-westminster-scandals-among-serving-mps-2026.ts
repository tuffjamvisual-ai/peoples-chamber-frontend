import type { EditorialEntry } from './types';

// Each MP added one at a time and fact-checked against public sources
// (BBC, Guardian, FT, Standards Committee findings, Hansard, court
// reports) before the entry is committed to this file.

const piece: EditorialEntry = {
  slug: 'biggest-westminster-scandals-among-serving-mps-2026',
  kicker: 'Investigation',
  headline: 'The biggest Westminster scandals among serving MPs, 2026',
  standfirst:
    'The MPs who broke the rules, the law or the trust of their constituents, and are still in the Commons. Compiled from Standards Committee findings, criminal records, registered interests disputes and published investigations. Each entry independently fact-checked.',
  publishedAt: '2026-06-08',
  authorByline: "The People's Chamber",
  body: [
    {
      type: 'mpEntry',
      rank: 1,
      name: 'Rupert Lowe',
      memberId: 5158,
      party: 'Restore Britain',
      topLine: 'Suspended by Reform UK: March 2025. KC report 25 March 2025 found credible evidence of unlawful harassment of two women. High Court refused to halt the parliamentary investigation, 14 May 2026.',
      paragraphs: [
        "Rupert Lowe was elected MP for Great Yarmouth on 4 July 2024 as one of five Reform UK MPs in the party's first Westminster breakthrough. He took the seat from the Conservatives with 14,385 votes against Labour's Keir Cozens on 12,959, a majority of 1,426 in a constituency Brandon Lewis had held for the Conservatives since 2010. Within eight months Lowe had been suspended from Reform UK. Within a year he had founded a rival party. He now sits as the sole MP for Restore Britain, a party that did not exist when he entered Parliament.",
        'In December 2024 an incident allegedly involving verbal threats against Reform UK chairman Zia Yusuf was referred to the Metropolitan Police for assessment. Separately, two female employees, one in Lowe\'s parliamentary office and one in his constituency office, brought complaints of bullying and discriminatory behaviour. Reform UK suspended Lowe in March 2025 and instructed Jacqueline Perry KC to investigate. Perry\'s report, published 25 March 2025, concluded there was "credible evidence of unlawful harassment of two women by both Mr Lowe and male members of his team". Both complainants resigned within months of starting, saying they believed they would have been sacked otherwise. Lowe denied all allegations, called the process a "political assassination" and stated publicly that Nigel Farage "must never become prime minister".',
        'On 23 July 2025 the Independent Complaints and Grievance Scheme, Parliament\'s internal misconduct body, commenced a formal investigation. Lowe applied to the High Court for judicial review to halt it, arguing procedural unfairness, perversity and illegality. The preliminary hearing was held on 17 March 2026 before Mr Justice Chamberlain, who handed down judgment on 14 May 2026 in R (Lowe) v ICGS [2026] EWHC 1163 (Admin). The Court held that the matter lay outside its jurisdiction: the ICGS investigation falls within the exclusive cognisance of the House of Commons and is protected by parliamentary privilege. The internal investigation can now proceed.',
        'While fighting the parliamentary investigation Lowe set up his own political operation. Restore Britain was founded on 30 June 2025 as a pressure group, announced as a political party on 13 February 2026, and formally registered with the Electoral Commission on 20 March 2026. By June 2026 it claimed more than 96,000 members and a single MP, Lowe himself. He has positioned the party to the right of Reform UK on immigration, drawing some interest from Elon Musk in early 2026. He defends his 1,426 majority in Great Yarmouth under a party banner that did not exist eighteen months ago, while a parliamentary misconduct investigation his lawyers failed to stop continues against him.',
      ],
      verdict: 'A serving MP who lost a workplace harassment finding, lost his party, lost his attempt to stop Parliament investigating him, and now sits for a party of one in a constituency he holds by 1,426 votes.',
    },
  ],
};

export default piece;
