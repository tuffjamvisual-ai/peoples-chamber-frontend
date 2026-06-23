import type { Metadata } from 'next';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';

export const metadata: Metadata = {
  title: "How UK Political Donations Work and Why the System Fails",
  description:
    "An explainer on the UK political donation system: self declaration, thresholds, intermediaries, permissibility tests, timing, and sanctions. Why the register records what politicians chose to disclose, not what actually happened.",
  alternates: { canonical: '/explainers/donations' },
};

export const revalidate = 86400;

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const ACCENT = '#7a1612';

const bodyP: React.CSSProperties = {
  margin: 0,
  marginBottom: '16px',
  fontFamily: '"Special Elite", monospace',
  fontSize: '15px',
  lineHeight: 1.75,
  color: INK,
};

export default function DonationsExplainer() {
  return (
    <DossierShell>
      <BackLink
        fallbackHref="/mps"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '24px', marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
          Explainer · UK political donations
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15, transform: 'rotate(-0.3deg)' }}>
          How UK political donations work, and why the system fails
        </h1>
      </header>

      <article style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: '20px' }}>
        <p style={bodyP}>
          The UK donation system is built on one idea: transparency instead of prohibition. Almost anyone eligible can give almost any amount to almost any politician, provided the gift is declared. The theory is that sunlight is the best disinfectant. The practice suggests sunlight works only when someone is looking.
        </p>
        <p style={bodyP}>
          The first problem is self declaration. MPs report their own interests. There is no independent audit. The Parliamentary Commissioner for Standards investigates complaints but does not routinely verify declarations against bank records or third-party disclosures. An MP who fails to declare a donation faces investigation only if someone notices and complains.
        </p>
        <p style={bodyP}>
          The second is thresholds. Donations below £500 to individual MPs need not be registered. Donations to parties below £11,180 need not be reported to the Electoral Commission. A donor giving £499 to twenty MPs distributes nearly £10,000 across the Commons without triggering a single declaration.
        </p>
        <p style={bodyP}>
          The third is intermediaries. Unincorporated associations can donate without revealing who contributed to the association. Trusts can donate without the settlors or beneficiaries appearing in any public filing. The Electoral Commission has flagged both routes as transparency gaps for years. Both remain open.
        </p>
        <p style={bodyP}>
          The fourth is permissibility. Only UK-registered voters, companies and trade unions can legally donate. But a UK-registered company can be wholly owned by foreign interests, funded entirely by overseas revenue, and operated for the benefit of non UK residents. The law tests incorporation, not economic substance.
        </p>
        <p style={bodyP}>
          The fifth is timing. Outside regulated election periods, delays of weeks or months between receiving and declaring a donation are common and lawful. By the time the public can see it, the political context that made it significant may have passed.
        </p>
        <p style={bodyP}>
          The sixth is sanctions. Fines for non compliance are low relative to the sums involved. For a donor willing to risk a penalty measured in thousands against a donation measured in tens of thousands, the economics of non compliance are favourable.
        </p>
        <p style={{ ...bodyP, marginBottom: 0 }}>
          No major reform has been implemented since the Political Parties, Elections and Referendums Act 2000. The methods of moving money into politics have grown more sophisticated. The methods of tracking it have not. The register remains a record of what politicians chose to tell us, not a record of what actually happened.
        </p>
      </article>

      <ScrollToTopButton />
    </DossierShell>
  );
}
