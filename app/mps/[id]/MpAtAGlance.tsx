// Server-rendered fact-strip rendered above the tabbed MagazineProfileSections.
//
// Reason for existing: MagazineProfileSections is a 'use client' component
// whose tab UI only renders the *active* tab's content into the initial HTML.
// For the 442 MPs without bios, that initial active tab is usually Contact
// (~30 words). The rest of the dossier — votes, interests, bills, roles,
// expenses — only appears post-hydration, so Google's first-pass crawl saw a
// ~110-word page with no substantive prose. This block ships 3-5 sentences of
// structured authoritative facts in the static HTML for every MP, on every
// crawl, regardless of which tab opens. GSC Soft 404 fix 2026-06-04.
//
// Design rules:
//   - prose-styled (Special Elite, matches the bio paragraphs)
//   - sentence structure varies based on what data is present, so MPs with
//     gaps (no votes, no interests, no bills) get a shorter clean block
//     rather than empty stubs
//   - sourced strictly from the existing fetch batch in page.tsx; no new
//     DB queries
//   - pronouns derive from mps.gender (M/F populated for 100% of current
//     MPs); 'They' is the safety-net fallback

import type { CSSProperties } from 'react';

type VoteRow = {
  vote_type: string;
  is_rebellion: boolean;
  division_title: string | null;
  division_date: string | null;
};

interface Props {
  fullName: string;
  party: string;        // raw party value from mps.party
  partyDisplay: string; // normalised display label (e.g. "Labour", "DUP")
  constituency: string | null;
  startDate: string | null;       // mps.start_date — first elected as current MP
  gender: string | null;          // mps.gender — "M" / "F" / null
  votes: VoteRow[];               // ordered most-recent first
  interestsCount: number;
  sponsoredBillsCount: number;
}

// 'June 2001' — month + year is enough; day-precision adds nothing.
function fmtMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// '28 April 2026' — day-precision for the last-vote line, where it matters.
function fmtFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MpAtAGlance({
  fullName,
  party,
  partyDisplay,
  constituency,
  startDate,
  gender,
  votes,
  interestsCount,
  sponsoredBillsCount,
}: Props) {
  // Subject ("He/She/They") + possessive ("his/her/their") + 'has' vs 'have'.
  // M/F covers 100% of the current MP set so the They branch is purely
  // defensive — if Parliament's data source ever drops gender it doesn't
  // crash the render.
  const isM = gender === 'M';
  const isF = gender === 'F';
  const subj = isM ? 'He' : isF ? 'She' : 'They';
  const poss = isM ? 'His' : isF ? 'Her' : 'Their';
  const have = subj === 'They' ? 'have' : 'has';

  // Filter to substantive votes (exclude no-shows from the count). The
  // 'no_vote' rows are kept in the underlying dataset for the absences-style
  // analytics elsewhere, but for the "how many times has X voted" question
  // the answer is aye + no.
  const cast = votes.filter((v) => v.vote_type === 'aye' || v.vote_type === 'no');
  const ayes = cast.filter((v) => v.vote_type === 'aye').length;
  const noes = cast.filter((v) => v.vote_type === 'no').length;
  const rebellions = votes.filter((v) => v.is_rebellion).length;
  const lastVote = cast[0] ?? null;

  const sentences: string[] = [];

  // Sentence 1 — always present.
  // "Mr Gregory Campbell has served as the Democratic Unionist Party MP for
  //  East Londonderry since June 2001."
  const partyLabel = partyDisplay || party || '';
  const since = startDate ? ` since ${fmtMonthYear(startDate)}` : '';
  const conLabel = constituency ? ` for ${constituency}` : '';
  const partyClause = partyLabel ? ` the ${partyLabel} MP` : ' an MP';
  sentences.push(`${fullName} ${have} served as${partyClause}${conLabel}${since}.`);

  // Sentence 2 — voting record. Skip cleanly if the MP has no recorded
  // votes (Sinn Féin abstentionists, very recent by-elections).
  if (cast.length > 0) {
    const rebClause =
      rebellions === 1 ? ', with one rebellion against the party whip'
      : rebellions > 1 ? `, with ${rebellions} rebellions against the party whip`
      : '';
    sentences.push(
      `${subj} ${have} cast ${cast.length} ${cast.length === 1 ? 'vote' : 'votes'} in this Parliament — ${ayes} aye, ${noes} no${rebClause}.`,
    );
  }

  // Sentence 3 — registered interests. Skip when count is zero (51 of the
  // 442 no-bio MPs).
  if (interestsCount > 0) {
    sentences.push(
      `${subj} ${have} filed ${interestsCount} ${interestsCount === 1 ? 'entry' : 'entries'} in the Register of Members' Financial Interests.`,
    );
  }

  // Sentence 4 — sponsored bills. Skip when count is zero (~half of the
  // backbenchers, every minister, etc.).
  if (sponsoredBillsCount > 0) {
    sentences.push(
      `${subj} ${have} sponsored ${sponsoredBillsCount} ${sponsoredBillsCount === 1 ? 'bill' : 'bills'} in this Parliament.`,
    );
  }

  // Sentence 5 — most recent vote. Anchors the page to a current event,
  // useful both for crawlers (freshness signal) and for readers wanting a
  // "what has this MP done lately" entry point.
  if (lastVote && lastVote.division_title && lastVote.division_date) {
    sentences.push(
      `${poss} most recent vote was on ${lastVote.division_title} on ${fmtFullDate(lastVote.division_date)} (${lastVote.vote_type}).`,
    );
  }

  // Styling matches the bio body prose: same font stack, same line height,
  // same colour. A faint italic byline label at the top reads as a magazine
  // standfirst rather than a database dump.
  const wrapStyle: CSSProperties = {
    fontFamily: 'Special Elite, monospace',
    color: '#14100d',
    fontSize: '16px',
    lineHeight: 1.8,
    letterSpacing: '0.01em',
    margin: '0 0 24px',
    padding: '0 0 16px',
    borderBottom: '1px solid rgba(122,22,18,0.18)',
    maxWidth: '780px',
  };
  const labelStyle: CSSProperties = {
    fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
    fontStyle: 'italic',
    fontSize: '13px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(20,16,13,0.55)',
    marginBottom: '10px',
    display: 'block',
  };

  return (
    <section aria-label="MP at a glance" style={wrapStyle}>
      <span style={labelStyle}>At a glance</span>
      {sentences.map((s, i) => (
        <p key={i} style={{ marginBottom: '12px' }}>
          {s}
        </p>
      ))}
    </section>
  );
}
