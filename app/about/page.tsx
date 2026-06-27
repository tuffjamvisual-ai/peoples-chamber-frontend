import type { Metadata } from 'next';
import ScrollToTopButton from '../components/ScrollToTopButton';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Open Govt, methodology, sources and editorial principles for our UK political transparency project.',
  alternates: { canonical: '/about' },
};

const paragraphs = [
  `Open Govt exists because British politics generates enormous amounts of public information every day, and almost none of it is designed for the public to actually use.`,
  `Bills move through Parliament. MPs vote on legislation. Ministers announce policies. Departments issue contracts. Political parties receive donations. Expenses are claimed. Advisory jobs are accepted. Committees publish reports. All of this information technically exists in public, but it is scattered across government websites, databases and documents that require hours of navigation and a working knowledge of parliamentary procedure to interpret.`,
  `Open Govt brings those fragments together.`,
  `We track legislation, parliamentary activity, political funding, MP records, departmental spending, public contracts, expenses and lobbying connections using official data from Parliament, IPSA, Companies House, the Electoral Commission and government publications. The goal is not to bury people under spreadsheets. It is to make public information readable, searchable and usable.`,
  `Politics often disappears behind procedure and language designed for insiders. A bill affecting millions can be summarised in jargon that obscures what is actually changing. Public spending can be technically disclosed while remaining practically invisible. Parliamentary debate can become theatre while important decisions pass underneath unnoticed.`,
  `Open Govt cuts through that.`,
  `We translate complex political processes into plain English. We follow legislation as it moves. We track voting records, public statements, financial interests and policy decisions in formats people can engage with. We also allow the public to respond through voting tools that compare public opinion with parliamentary outcomes.`,
  `The aim is not to tell people what to think. It is to give them visibility into what is happening.`,
  `We are independent and intentionally direct. British politics has long been surrounded by managed language, rehearsed messaging and institutional opacity. Open Govt approaches politics with scrutiny rather than ceremony. Public institutions become healthier when they are easier to examine.`,
  `That does not mean reducing politics to outrage or spectacle. Context matters. Accuracy matters. Public trust depends on facts being traceable. Our work links back to original records and official sources so users can inspect the evidence themselves.`,
  `The platform is built around the belief that democratic engagement should not end at election time. Most political decisions happen between elections with limited public visibility. By tracking bills, departments, financial interests and parliamentary behaviour continuously, we create a live civic record rather than a snapshot every few years.`,
  `Open Govt is still evolving. New datasets and tracking systems are continually being added. The long term goal is a permanent public facing record of political activity in the United Kingdom accessible to everyone, not just journalists, researchers or political insiders.`,
  `Politics affects everyone. Understanding it should not require permission.`,
];

export default function AboutPage() {
  return (
    <OpenGovShell pageStamp="About">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '5%' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
          The People&apos;s Chamber
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          About
        </h1>
      </header>

      <article style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ fontSize: '17px', lineHeight: 1.85, letterSpacing: '0.01em' }}>
          {paragraphs.map((para, idx) => {
            const tilt = idx % 4;
            const rot = tilt === 0 ? '0.08deg' : tilt === 1 ? '-0.12deg' : tilt === 2 ? '0.1deg' : '-0.08deg';
            return (
              <p key={idx} style={{ marginBottom: '20px', transform: `rotate(${rot})` }}>
                {para}
              </p>
            );
          })}
        </div>
      </article>

      <ScrollToTopButton />
    </OpenGovShell>
  );
}
