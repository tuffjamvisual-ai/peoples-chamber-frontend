// The links to someone's PMQs page, one per part they played, counted apart (owner, 6 Nov 2026). No exchanges, no link. Client components use this too.
export type PmqsCounts = { asked: number; prime_minister: number; standing_in: number };

// One link to the member's PMQs page (T1-5x, owner 10 Nov 2026: a page links a destination once), its label naming each
// count the member has: questions asked, answers as Prime Minister, answers standing in.
export function pmqsLinks(memberId: number, c: PmqsCounts): { href: string; label: string }[] {
  const answered = c.prime_minister > 0 || c.standing_in > 0;
  const n = (v: number) => v.toLocaleString('en-GB');
  const parts = [
    c.asked > 0 ? `${n(c.asked)} ${answered ? (c.asked === 1 ? 'question asked' : 'questions asked') : (c.asked === 1 ? 'question' : 'questions')}` : null,
    c.prime_minister > 0 ? `${n(c.prime_minister)} ${c.prime_minister === 1 ? 'answer' : 'answers'} as Prime Minister` : null,
    c.standing_in > 0 ? `${n(c.standing_in)} standing in for the Prime Minister` : null,
  ].filter(Boolean);
  return parts.length ? [{ href: `/mps/${memberId}/pmqs`, label: `At PMQs: ${parts.join(', ')}` }] : [];
}
