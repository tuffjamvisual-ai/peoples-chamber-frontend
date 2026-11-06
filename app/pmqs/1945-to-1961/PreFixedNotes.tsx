const ACCENT = '#7a1612';
const note = { fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' };
const SPEAKER_URL = 'https://api.parliament.uk/historic-hansard/commons/1961/oct/24/questions-to-the-prime-minister';

export function ExperimentNote() {
  return (
    <p style={note}>
      <strong>The 3.15 p.m. experiment.</strong> The Speaker told the House on 24 October 1961 that on 18 July he had announced that &ldquo;the Prime Minister was willing to try the experiment of answering his Questions on Tuesdays and Thursdays at 3.15 p.m.&rdquo;{' '}
      Source: <a href={SPEAKER_URL} rel="noopener" className="og-tap" style={{ color: ACCENT, textDecoration: 'underline' }}>HC Deb 24 October 1961 vol 646 cc740-1</a>
    </p>
  );
}

export const UNCONFIRMED_NOTE = 'Date from the Hansard API. It could not be confirmed on Historic Hansard.';

// The notes every page of these questions carries (load-plan.md, "What pages must say", with the owner's wording for who answered).
export default function PreFixedNotes({ answeredBySomeoneElse }: { answeredBySomeoneElse: number }) {
  return (
    <>
      <p style={note}>Before July 1961 there was no fixed time for questions to the Prime Minister. They came up among other questions, so these are individual questions, not PMQs sessions.</p>
      <p style={note}>Only questions answered aloud are here. Written answers to the Prime Minister are not shown.</p>
      <p style={note}>Compiled from Hansard&rsquo;s digital records, which have gaps, so some questions may be missing.</p>
      <p style={note}>Another minister answered {answeredBySomeoneElse.toLocaleString('en-GB')} of these questions.</p>
      <p style={note}>Names and text are as they stand in Historic Hansard, including its misprints.</p>
    </>
  );
}
