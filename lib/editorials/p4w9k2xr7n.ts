import type { EditorialEntry } from './types';

// Companion comment piece to the Harborne investigation (revised, named version).
// All facts verified: £30m via The Nerve from EC filings; £5m gift revealed by the
// Guardian 29 April 2026, Standards inquiry 13 May; £18.2bn Sunday Times Rich List;
// 12% of Tether; Harborne's WSJ defamation suit (Feb 2024, Tether/Bitfinex banking
// article) and his ongoing defamation proceedings against Ben Habib (the underlying
// allegation is not restated); the bill deleted, obtained
// from Scribd, Wayback blocked. The Habib and WSJ suits are reported as litigation
// (matters of public record), not as endorsements of the underlying allegations,
// and the piece asserts no bargain — it is comment on why the story is not covered.
const piece: EditorialEntry = {
  slug: 'p4w9k2xr7n',
  kicker: 'Money and Power',
  headline: 'Why Nobody Is Talking About the Biggest Donor in British Politics',
  standfirst:
    'One man has given roughly £30 million to British politics, funds two thirds of the party leading the polls, and gave its leader a £5 million gift that stayed undeclared for nearly two years. He is worth £18.2 billion and litigates against journalists. This should be dominating the front pages. It is nowhere near them. Here is why.',
  publishedAt: '2026-07-01',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: 'One man has given roughly £30 million to British political parties and politicians over seven years. That figure comes from Electoral Commission filings compiled by the investigative outlet The Nerve. His donations account for approximately two thirds of all funding received by Reform UK and its predecessor the Brexit Party. He gave the party’s leader a £5 million personal gift that went undeclared for nearly two years until the Guardian revealed it in April 2026. He gave a former Prime Minister £1 million. He lives in Thailand. He holds Thai citizenship. He owns 12 percent of the company behind the world’s most traded cryptocurrency. He is worth £18.2 billion according to the Sunday Times Rich List. He communicates exclusively through Schillings, one of London’s most aggressive defamation firms. He has never given a public interview about any of it.' },
    { type: 'paragraph', text: 'The Parliamentary Standards Commissioner opened a formal inquiry in May 2026. The Electoral Commission is considering its own. This should be dominating the front pages. It is nowhere near them.' },
    { type: 'paragraph', text: 'Part of the reason is that English defamation law makes it expensive to write about rich people who do not want to be written about. Schillings has threatened The Nerve, which broke most of the original reporting. Harborne is currently in defamation proceedings against Ben Habib, the former deputy leader of Reform. He previously sued the Wall Street Journal over its reporting on Tether’s banking arrangements. Most newsrooms look at the legal budget required to defend a claim from someone worth £18.2 billion and decide the story is not worth the risk. The investigative outlets do the work. The larger outlets report that the investigation exists and leave it there.' },
    { type: 'pullQuote', text: 'A billionaire with a London law firm on retainer does not need to win a case to kill a story. The pre-action letter is enough.' },
    { type: 'paragraph', text: 'Part of it is that the story is genuinely complicated. Seven years of Electoral Commission filings. Two political parties. Two prime ministers. A cryptocurrency company most voters have never heard of. A proposed parliamentary bill that was published, promoted at a conference in Las Vegas and then quietly deleted from the party’s website after the investigation began. Try fitting that into a headline. Compare it to “government cuts roads to fund submarines.” One sentence explains itself. The other needs a diagram.' },
    { type: 'paragraph', text: 'Part of it is that Reform leads the polls and its voters are not interested in hearing it. Editors suspect, probably correctly, that publishing the story will not peel off a single supporter and may get folded into the party’s existing narrative that the establishment is trying to bring Farage down. That is a calculation about audience, not about journalism. It is also a calculation that treats the public as a market to be served rather than a democracy to be informed.' },
    { type: 'paragraph', text: 'And part of it is that every party takes money from donors who want something. Labour donors get peerages. Conservative donors get contracts. The system has been this way for so long that unprecedented concentration of funding in one individual gets treated as a difference of degree rather than a difference of kind. If everyone is compromised, nobody is. That is the defence. It works because it is partly true and completely corrosive.' },
    { type: 'paragraph', text: 'None of that changes what is on the public record. The Electoral Commission filings are published. The investigations are open. The bill existed, was documented by multiple news organisations before its deletion, and its full text was obtained from Scribd after Reform removed it from their website and blocked the Wayback Machine from archiving their pages. The party did not respond when The Nerve asked why the bill was taken down or whether it still supported its provisions.' },
    { type: 'paragraph', text: 'Both men have addressed the coverage. Harborne, who has never given an interview about any of this, said in a brief statement to the Telegraph that he gave the money out of “great admiration for the decades of work [Farage] had done to achieve Brexit.” Farage says the gift was made on a completely unconditional basis and that he “can’t be bought by anybody.”' },
    { type: 'paragraph', text: 'The question is not whether this information matters. It obviously does. The question is whether the systems that are supposed to bring it to the public, the press, the regulator, the standards regime, are capable of doing their job when the subject has the resources to make that job legally dangerous, editorially complicated and politically unrewarding. Right now they are not. That is why this site exists.' },
    { type: 'cta', text: 'Read the documented record: Christopher Harborne, Nigel Farage and £30 million', href: '/editorials/hb9k2xq7mw' },
  ],
};

export default piece;
