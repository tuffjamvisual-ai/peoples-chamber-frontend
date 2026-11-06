// The links to someone's PMQs page, one per part they played, counted apart (owner, 6 Nov 2026). No exchanges, no link. Client components use this too.
export type PmqsCounts = { asked: number; prime_minister: number; standing_in: number };

export function pmqsLinks(memberId: number, c: PmqsCounts): { href: string; label: string }[] {
  const answered = c.prime_minister > 0 || c.standing_in > 0;
  const n = (v: number) => v.toLocaleString('en-GB');
  const page = `/mps/${memberId}/pmqs`;
  return [
    ...(c.asked > 0 ? [{ href: answered ? `${page}#asked` : page, label: `${answered ? 'Questions asked at PMQs' : 'Questions at PMQs'} (${n(c.asked)})` }] : []),
    ...(c.prime_minister > 0 ? [{ href: `${page}#answers-pm`, label: `Answers as Prime Minister (${n(c.prime_minister)})` }] : []),
    ...(c.standing_in > 0 ? [{ href: `${page}#answers-standing-in`, label: `Answers standing in for the Prime Minister (${n(c.standing_in)})` }] : []),
  ];
}
