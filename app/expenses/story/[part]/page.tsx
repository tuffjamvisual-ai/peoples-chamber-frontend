// /expenses/story/[part] — 'The Invisible Cost of Keeping Parliament
// Running' feature, split across three chapters. Each chapter shares
// the parchment dossier shell; navigation between chapters uses the
// View Transitions API for the parchment fold animation (see layout).

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import DossierShell from '../../../components/DossierShell';
import BackLink from '../../../components/BackLink';
import StoryNav from '../StoryNav';

export const revalidate = 86400;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const ACCENT = '#6b2417';

type Chapter = {
  number: number;
  subtitle: string;
  paragraphs: string[];
};

const CHAPTERS: Chapter[] = [
  {
    number: 1,
    subtitle: 'The headline numbers',
    paragraphs: [
      `Every year, British taxpayers provide each MP with roughly £177,000 to pay for staff. Another £25,000 covers office costs. London-based MPs get more. Those with homes in two places get accommodation budgets. And travel between Parliament and constituency comes with no spending cap.`,
      `It sounds specific and controlled. In reality, the system offers far less visibility than most people assume.`,
      `The rules are clear. MPs can only spend money on parliamentary purposes, not party campaigns or ministerial work. They must show receipts. They cannot pocket the funds. But ask how much the average MP actually spends, which budgets get exceeded regularly, or whether these amounts are reasonable, and the answers become fuzzy.`,
      `The staffing budget illustrates the problem. £177,000 sounds substantial until you consider that each MP represents between 56,000 and 72,000 people. A typical MP employs around four staff members. These people handle constituent complaints, research parliamentary questions, prepare speeches, manage surgeries. The work is genuine. Whether the budget is adequate or excessive remains unclear.`,
    ],
  },
  {
    number: 2,
    subtitle: 'The transparency illusion',
    paragraphs: [
      `Parliament maintains that all spending is published online. Technically true. But published data that ordinary voters cannot easily find or understand is not the same as transparency. The information exists. Accessing it requires navigating government websites and parsing expense claims. Most people never bother.`,
      `This creates a peculiar situation. MPs are subject to stricter oversight than many private sector roles. Yet the public knows less about what they spend than what happens in many businesses. The contrast between claimed transparency and actual obscurity is striking.`,
      `The real problem runs deeper. The current system exists because its predecessor failed catastrophically. In 2009, the expenses scandal revealed MPs abusing allowances for housing costs, furnishings, personal items. The public anger was justified. The system was reformed. Yet that history receives little mention in current discussions about how MPs spend money. The scandal is treated as ancient history rather than as context for understanding why skepticism persists.`,
    ],
  },
  {
    number: 3,
    subtitle: 'The gaps that remain',
    paragraphs: [
      `Several elements of the current system invite questions that nobody adequately answers. Travel receives no budget cap. MPs can claim unlimited journeys between Westminster and constituency. The stated reason is that unlimited travel prevents restriction. To voters paying their own commute costs, uncapped parliamentary travel while other spending is limited may seem difficult to defend.`,
      `The accommodation budget creates similar tensions. MPs with homes in both London and their constituency can claim housing costs. The amounts vary based on location. London MPs receive higher allocations due to property costs. But the system allows for ambiguity. What constitutes a necessary accommodation expense? How is that determined?`,
      `The staffing budget raises different questions. How are staff hired? What qualifications matter? How much variation exists between MPs? Some employ family members. Others bring in experienced researchers. The quality and nature of parliamentary support likely varies significantly, yet public information about this remains limited.`,
      `Perhaps most revealing is the Contingency Panel. MPs who exceed their budgets can apply for additional funding if they claim exceptional circumstances. The panel can approve extra money. But how often is this used? What counts as exceptional? When do MPs routinely exceed budgets? The answers remain opaque.`,
      `The broader picture suggests a system designed to prevent the worst abuses while permitting continued opacity. Rules exist. Money is tracked. Spending is technically published. Yet the combination of limited accessibility, outdated information, and absence of meaningful comparisons means the public knows far less about MP spending than transparency claims suggest.`,
      `This is not necessarily corruption. It is something more mundane but equally problematic. A system that functions adequately for insiders while remaining effectively invisible to the people funding it. MPs are held accountable by rules most voters never read and cannot easily verify. That is not transparency. It is the appearance of transparency masking a genuine information gap between government and governed.`,
    ],
  },
];

export async function generateStaticParams() {
  return CHAPTERS.map((c) => ({ part: String(c.number) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ part: string }>;
}): Promise<Metadata> {
  const { part } = await params;
  const ch = CHAPTERS.find((c) => c.number === Number(part));
  if (!ch) return { title: 'Story' };
  return {
    title: `The Invisible Cost — Part ${ch.number}: ${ch.subtitle}`,
    description: ch.paragraphs[0]?.slice(0, 160) || '',
    alternates: { canonical: `/expenses/story/${ch.number}` },
  };
}

export default async function StoryChapter({
  params,
}: {
  params: Promise<{ part: string }>;
}) {
  const { part } = await params;
  const n = Number(part);
  const chapter = CHAPTERS.find((c) => c.number === n);
  if (!chapter) notFound();

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/expenses"
        label="← Back to Top 10"
        className="no-hover-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '-6%',
          marginBottom: '12px',
          color: INK,
          textDecoration: 'none',
          fontSize: 'clamp(18px, 2.2vw, 28px)',
          transform: 'rotate(-0.2deg)',
        }}
      />

      {/* The article element is named for the View Transitions API
          so the layout's keyframes animate it as a single fold. */}
      <article
        style={{
          viewTransitionName: 'pca-chapter',
          marginTop: '2%',
        }}
      >
        <header style={{ marginBottom: '32px' }}>
          <p
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: ACCENT,
            }}
          >
            Feature · Analysis · Part {chapter.number} of {CHAPTERS.length}
          </p>
          <h1
            style={{
              fontSize: 'clamp(26px, 3.6vw, 42px)',
              fontWeight: 'bold',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '10px',
              transform: 'rotate(-0.2deg)',
              color: INK,
            }}
          >
            The Invisible Cost of Keeping Parliament Running
          </h1>
          <p
            style={{
              fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: 'clamp(15px, 1.6vw, 19px)',
              color: INK_SOFT,
              margin: 0,
            }}
          >
            {chapter.subtitle}
          </p>
        </header>

        <div
          style={{
            fontFamily: 'Special Elite, monospace',
            fontSize: 'clamp(13px, 1.35vw, 15px)',
            lineHeight: 1.75,
            color: INK,
            maxWidth: '74ch',
          }}
        >
          {chapter.paragraphs.map((p, i) => (
            <p key={i} style={{ margin: '0 0 1.1em 0' }}>
              {p}
            </p>
          ))}
        </div>

        <StoryNav part={chapter.number} total={CHAPTERS.length} />
      </article>
    </DossierShell>
  );
}
