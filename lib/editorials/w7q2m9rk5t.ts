import type { EditorialEntry } from './types';

// Briefing: the £4.7bn defence funding gap as a poison pill for the incoming PM.
// Fact-checked: £15bn plan / £10.3bn committed / £4.7bn unfunded (gov.uk); Healey
// resigned 11 June, promised £13.5bn, wanted £18bn (CapX, earlier research);
// Burnham briefed on the plan but the gap withheld (Guardian via GB News), the
// Pollard "learned yesterday" line attributed to Sky News; Badenoch "summer of
// chaos" (Washington Examiner); Starmer resigned 22 June, plan published 30 June.
const piece: EditorialEntry = {
  slug: 'w7q2m9rk5t',
  kicker: 'The Succession',
  headline: 'Burnham Finds Out About the £4.7 Billion at the Same Time as the Defence Minister',
  standfirst:
    'The most damaging detail in the Defence Investment Plan is not the £4.7 billion funding gap. It is that the incoming Prime Minister and the minister who has to deliver the plan both found out about the hole on the day it was published. That is not a transition. That is an ambush.',
  publishedAt: '2026-07-03',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'The most damaging detail in the Defence Investment Plan is not the £4.7 billion funding gap. It is that the man about to become Prime Minister and the minister responsible for implementing the plan both found out about it on the same day it was announced.' },
    { type: 'paragraph', text: 'Sky News reported that defence minister Luke Pollard said he only learned about the shortfall yesterday. Burnham was reportedly told at the same time, briefed on the plan but not on the fact that nearly a third of the new money had not yet been found. The sitting Defence Minister and the incoming Prime Minister discovered simultaneously that a large part of the new defence money does not exist yet.' },
    { type: 'pullQuote', text: 'That is not a transition. That is an ambush.' },
    { type: 'paragraph', text: 'Follow the numbers. John Healey resigned as Defence Secretary on 11 June because the settlement was not big enough. He was promised £13.5 billion. He wanted £18 billion. He left on principle. The published plan offers £15 billion, £1.5 billion more than what drove Healey out. But £4.7 billion of that is unfunded. Subtract the unfunded portion and the actual committed increase is £10.3 billion. That is less than what Healey resigned over. The plan that was supposed to end the defence funding crisis has published a headline number that includes money nobody has found, presented it as a solution and left the next government to deal with the gap.' },
    { type: 'paragraph', text: 'This is what Starmer’s premiership looked like from the inside. Announce the number. Defend the headline. Leave the hole for someone else to fill. The £22 billion black hole that justified the winter fuel cut. The employer National Insurance increase that broke the manifesto pledge. The tax rises across two Budgets. Each time the pattern was the same: a problem inherited or created, a headline deployed to manage it, and the actual cost pushed forward. The £4.7 billion is the last example. It may also be the most cynical, because Starmer published it eight days after announcing his resignation, binding a successor who did not write the plan, did not approve the plan and will spend his first Budget trying to pay for it.' },
    { type: 'paragraph', text: 'Badenoch said Britain was heading for “a summer of chaos.” The chaos is not the transition. The chaos is what the transition reveals about how the outgoing government made its decisions.' },
  ],
};

export default piece;
