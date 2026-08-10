import type { EditorialEntry } from './types';

// Briefing: the Defence Investment Plan's road cuts. Fact-checked against gov.uk
// (£298bn, £15bn, £10.3bn/£4.7bn, £700m DfT roads, £2bn DESNZ, 1% capital,
// pothole/rail/bus protected) and coverage of the A46 Newark Bypass / A38 Derby
// Junctions cancellations, Claire Ward, Hamish Falconer and TSSA reactions
// (GB News, New Civil Engineer, HuffPost, Newark Advertiser).
const piece: EditorialEntry = {
  slug: 'k3p9w7nx2d',
  kicker: 'Defence and Money',
  headline: 'The Defence Black Hole Just Swallowed a Bypass',
  standfirst:
    'Yesterday the government announced £298 billion on defence. Today the row is about the roads it cut to pay for it. The A46 and the A38, promised to communities outside London, have been offered up for submarines and drones those communities will never see.',
  publishedAt: '2026-07-01',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'Yesterday the government announced £298 billion on defence. Today the row is about the roads it cut to pay for it. That tells you everything about how this plan was built.' },
    { type: 'paragraph', text: 'The Department for Transport will lose £700 million from its roads budget. The A46 Newark Bypass and the A38 Derby Junctions are on the chopping block, both part of the government’s own £27 billion Road Investment Strategy announced earlier in 2026. Neither has entered contract. Both were described by local MPs as well advanced and strategically important. Both were promised to communities that were told infrastructure investment was coming. Both have been offered up to pay for submarines and drones that those communities will never see.' },
    { type: 'paragraph', text: 'East Midlands Mayor Claire Ward said her region appeared to be “the only region told it is sacrificing its road investment programme.” She was not consulted. Lincoln MP Hamish Falconer, Labour, called the A46 scheme “excellent value for money and of strategic importance” and said he would seek an urgent meeting with the incoming Prime Minister. The TSSA general secretary said “it is because of decisions like this that Keir Starmer’s premiership came to an end.”' },
    { type: 'pullQuote', text: 'This is the pattern that destroyed Starmer.' },
    { type: 'paragraph', text: 'She is right. Promise investment. Announce the headline. Then quietly raid the budgets that were supposed to deliver the investment to pay for something else. The winter fuel cut was the first. The employer National Insurance increase was the second. The road cuts are the third. Each time the same structure: a big national announcement funded by taking money from the people who were told they would benefit from it.' },
    { type: 'paragraph', text: 'The maths. £15 billion additional defence spending. £10.3 billion identified. £4.7 billion unfunded, to be confirmed at Budget 2026. The £700 million from roads and £2 billion from Energy are part of the £10.3 billion. Every department contributes 1 percent of its capital budget. Pothole repair, rail and bus services are supposedly protected. The things being cut are the road upgrades promised to communities outside London.' },
    { type: 'paragraph', text: 'Burnham gave a speech on Monday about rewiring Britain and devolving power to the regions. One day later the government he is about to inherit cut regional road projects to fund national defence. If No10 North is going to mean anything, it needs to start by not taking money from the North to pay for the South’s priorities. That contradiction arrived before he did.' },
  ],
};

export default piece;
