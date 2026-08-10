import type { EditorialEntry } from './types';

// Briefing: Farage's property portfolio as a transparency story. Fact-checked per
// user FLAGS: £4m+ mortgage-free portfolio (The Times); Clacton house bought by
// Ferrari in cash; Thorn In Side Ltd owns two Folkestone and Hythe properties;
// Commissioner confirmed company properties exempt unless personally used or
// benefited; 17 code breaches / £384,000; £5m Harborne gift inquiry; Ferrari met
// Farage 2007 (Strasbourg waitress); IDDE accused of diverting public money for
// UKIP; The Movement with Steve Bannon; Land Registry showed the Clacton house in
// Ferrari's name only. The IDDE allegation is attributed ("accused of").
// Two line-edits applied per editor: the analytical "this matters because" opener
// recast, and the "the question is" construction rewritten as a statement.
const piece: EditorialEntry = {
  slug: 'v3n8q2xk6w',
  kicker: 'Money and Power',
  headline: 'Farage’s Property Problem Is Not About Property',
  standfirst:
    'The Times reports that Nigel Farage and his partner Laure Ferrari hold a mortgage-free property portfolio worth more than £4 million, some of it off the parliamentary register. He may be technically compliant. For the man who spent thirty years attacking Westminster opacity, technically compliant is the problem.',
  publishedAt: '2026-07-05',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'The Times reported that Nigel Farage and his partner Laure Ferrari have a mortgage-free property portfolio worth more than £4 million. The properties include a home in Clacton purchased by Ferrari in cash during the 2024 campaign, two residential properties in Folkestone and Hythe held through Farage’s company Thorn In Side Ltd, and other assets. Some of these interests appear on the parliamentary register. Others do not.' },
    { type: 'paragraph', text: 'The parliamentary rules say company-owned properties do not need to be declared unless the MP personally uses or personally benefits from them. The Standards Commissioner has confirmed that interpretation in correspondence. So Farage may well be technically compliant. The register does not describe usage or occupancy, which means the public has no way to verify whether the exemption applies.' },
    { type: 'paragraph', text: 'Strip the technical detail away and look at who is making the argument. Farage built a political career on the argument that Westminster politicians are self-serving, financially opaque and unaccountable to the public. He said the system needed someone from outside to clean it up. He is now the MP who has been found to have breached the Code of Conduct 17 times for late declarations of £384,000 in outside earnings. He is the subject of a formal Standards Commissioner inquiry over an undeclared £5 million gift from the man who funds two thirds of his party. His company owns properties that may or may not need to be on the register depending on an interpretation the public cannot verify. And his defence in every case has been the same: the rules say I do not have to.' },
    { type: 'paragraph', text: 'The rules may say that. A man who spent thirty years telling everyone the rules were not good enough does not get to hide behind them when they protect him.' },
    { type: 'pullQuote', text: 'Farage does not have a corruption problem. He has a transparency problem.' },
    { type: 'paragraph', text: 'Ferrari’s role runs through several of these stories. She purchased the Clacton house in cash. Farage told voters during the campaign that he had bought a home in Clacton. Land Registry records showed the property was in Ferrari’s name only. She first met Farage in 2007 when she was working as a waitress in Strasbourg. She went on to work as his EU parliamentary aide, ran the IDDE think tank that was accused of illegally diverting public money for UKIP’s benefit, and was a founding member of The Movement alongside Steve Bannon. She is not a peripheral figure. She is central to the financial and political operation around Farage, and several of the assets now under scrutiny are in her name.' },
    { type: 'paragraph', text: 'Farage does not have a corruption problem. He has a transparency problem. And for a politician whose entire brand is built on transparency, that is worse.' },
  ],
};

export default piece;
