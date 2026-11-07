const link = { color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' };

// The credit the licence asks for, word for word (load plan, 6 Nov 2026), at the foot of /register-history. Removed from MP pages
// on the owner's request (7 Nov 2026, M2).
export default function RegisterCredit() {
  return (
    <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#14100d', margin: '14px 0 0', maxWidth: '46em' }}>
      Register entries from November 2000 to March 2024 compiled from <a href="https://www.mysociety.org/" style={link}>mySociety</a>&apos;s TheyWorkForYou archive, licensed under <a href="https://creativecommons.org/licenses/by-sa/2.5/" style={link}>CC BY-SA 2.5</a>. This historic register data is shared under the same licence.
    </p>
  );
}
