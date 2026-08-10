import type { EditorialEntry } from './types';

// Briefing: council-tax court summonses. Fact-checked per FLAGS: 1,430,726 summoned
// 2024/25 and <200 councils responding (GMB FOI); Rachel Harrison, GMB National
// Secretary, "completely broken"; West Midlands 239,000 / £490m (Coventry Telegraph);
// Blackpool £32m / 25,388 (Blackpool Gazette); Coventry 8,322; April repayment-plan
// changes (LocalGov); Band D up 66% since 2010; 295 of 384 at max increase; at least
// eight councils effectively bankrupt (earlier research).
const piece: EditorialEntry = {
  slug: 'ck8m2wq7x3',
  kicker: 'Councils and Money',
  headline: '1.5 Million People Dragged to Court Over Council Tax. The Councils Doing the Dragging Are Broke Too.',
  standfirst:
    'At least 1,430,726 people were summoned to court over unpaid council tax in 2024/25, from GMB freedom of information requests. Councils are raising bills because central funding does not cover demand, then taking residents to court when they cannot pay. The system, GMB says, is completely broken.',
  publishedAt: '2026-07-08',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'At least 1,430,726 people were summoned to court over unpaid council tax in 2024/25. That figure comes from GMB freedom of information requests to every council in Britain with collection responsibility. Fewer than 200 replied within the deadline. The true number is higher. Nobody knows how much higher because the councils that did not respond are the ones least likely to want the public knowing.' },
    { type: 'paragraph', text: 'Rachel Harrison, GMB National Secretary, called the system “completely broken.” She is right. The banding system has not been revalued since 1991. Councils are raising bills because central government funding does not cover demand. Then they are taking residents to court when those residents cannot pay the increased bill for the reduced service. In the West Midlands alone, 239,000 people were summoned and £490 million is owed. In Blackpool, £32 million is outstanding and 25,388 accounts are in arrears. In Coventry, 8,322 households went to court in a single year.' },
    { type: 'paragraph', text: 'The government announced changes in April giving households more time to settle arrears and requiring councils to work on repayment plans before going to court. That is a start. It does not fix a system where the average Band D bill has risen 66 percent since 2010, where 295 of 384 councils used the maximum increase available last year, and where at least eight councils have effectively gone bankrupt. The bill goes up. The services go down. And when people cannot pay, the state takes them to court to fund the services it is no longer providing.' },
  ],
};

export default piece;
