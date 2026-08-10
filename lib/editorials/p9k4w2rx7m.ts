import type { EditorialEntry } from './types';

// Briefing: the £4.7bn defence funding hole as a credibility story. Fact-checked
// per user FLAGS: 2.7% GDP by 2027/28 (gov.uk); £54bn to ~£80bn by 2029/30;
// £4.7bn unfunded; Pollard and Burnham told the day it was announced (Sky News);
// Healey resigned 11 June, promised £13.5bn, wanted £18bn, plan offers £15bn,
// £10.3bn committed after the gap (CapX, gov.uk); £700m roads, A46 Newark, A38
// Derby (gov.uk); Claire Ward (GB News); TSSA general secretary (HuffPost).
// Four line-edits applied per editor: the "ambush" line replaced with the plain
// factual sentence, and the closing "lame duck" line tightened to "what is."
const piece: EditorialEntry = {
  slug: 'p9k4w2rx7m',
  kicker: 'Defence and Money',
  headline: 'Starmer Published the Defence Plan. Burnham and His Own Minister Found Out About the Hole at the Same Time.',
  standfirst:
    'The government’s defence plan promises to lift spending towards 2.7 percent of GDP. It also contains a £4.7 billion hole that the sitting Defence Minister and the incoming Prime Minister say they learned about on the day it was published. This is now a credibility story, not a spending story.',
  publishedAt: '2026-07-04',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'The defence investment row is now a credibility story, not a spending story.' },
    { type: 'paragraph', text: 'The government published a plan promising to lift defence spending towards 2.7 percent of GDP by 2027/28, with total annual funding rising from £54 billion to almost £80 billion by 2029/30. The headline commitment is real. The NATO obligation is being addressed faster than any recent government has managed. That deserves acknowledgment.' },
    { type: 'paragraph', text: 'The problem is the £4.7 billion that has not been found.' },
    { type: 'paragraph', text: 'Sky News reported that defence minister Luke Pollard said he only learned about the shortfall on the day it was announced. Andy Burnham, the man who will almost certainly be Prime Minister within three weeks, was reportedly told at the same time. The sitting Defence Minister and the incoming Prime Minister found out about the hole on the same morning it was announced to the country. Nearly a third of the new money does not exist yet.' },
    { type: 'paragraph', text: 'John Healey resigned as Defence Secretary on 11 June because the settlement was not big enough. He was promised £13.5 billion in additional spending. He wanted £18 billion. The published plan offers £15 billion. That sounds like a compromise. But £4.7 billion of the £15 billion is unfunded. Subtract the hole and the committed increase is £10.3 billion, less than the amount Healey resigned over. The plan that was supposed to end the defence row has published a headline number that includes money nobody has identified, called it a plan and handed the receipt to the next government.' },
    { type: 'pullQuote', text: 'Subtract the hole and the committed increase is £10.3 billion, less than the amount Healey resigned over.' },
    { type: 'paragraph', text: 'The £700 million coming out of the roads budget to help fill the gap has already hit specific projects. The A46 Newark Bypass and the A38 Derby Junctions, both part of the government’s own £27 billion Road Investment Strategy, are on the chopping block. Claire Ward, the East Midlands Mayor, said her region appeared to be the only one told it was sacrificing its road programme. She was not consulted. The TSSA general secretary said it was “because of decisions like this that Keir Starmer’s premiership came to an end.”' },
    { type: 'paragraph', text: 'Starmer is publishing spending commitments eight days after announcing his resignation, binding a successor who did not write the plan, did not approve the plan and will spend his first Budget finding the money for it. If that is not a lame duck premiership, what is.' },
  ],
};

export default piece;
