// Editorial article shape. One file per piece in lib/editorials/<slug>.ts,
// registered in lib/editorials/index.ts. Each editorial is hand-authored;
// the page renderer at app/editorials/[slug] reads from this seed.

export type EditorialEntry = {
  slug: string;
  headline: string;
  standfirst: string;
  publishedAt: string;          // ISO date
  authorByline: string;
  // Optional eyebrow shown above the headline (e.g. "Investigation",
  // "Money & Power", "Reading the Record").
  kicker?: string;
  // Optional hero image rendered above the headline + ink border on
  // the article page and as the lead photo on the homepage card.
  heroImage?: string;           // public path, e.g. '/councils.webp'
  heroAlt?: string;
  body: Block[];                // dispatched by `type`
};

export type Block =
  | { type: 'paragraph'; text: string }
  // A level-3 heading may carry an optional polaroid portrait, floated to
  // the left of the entry (used by the revolving-door piece). photoHref
  // links the frame through to the subject's profile.
  | { type: 'heading'; level: 2 | 3; text: string; photo?: string; photoAlt?: string; photoHref?: string }
  // Short context line (e.g. party + offices held) rendered directly
  // under a heading so the reader knows who the subject is.
  | { type: 'bioLine'; text: string }
  | { type: 'pullQuote'; text: string }
  // Author signature image (transparent PNG/WebP) rendered at the foot of
  // the piece.
  | { type: 'signature'; src: string; alt?: string }
  // Prominent call-to-action link (e.g. into a companion editorial).
  | { type: 'cta'; text: string; href: string }
  | {
      type: 'councilEntry';
      rank: number;
      name: string;                  // display name (rendered uppercase)
      councilSlug?: string;          // links into /councils/[slug] when present
      topLine: string;               // 'Section 114 notice: June 2023. Deficit: £1.2 billion against a £16 million annual budget.'
      paragraphs: string[];
      verdict: string;               // closing verdict line
    }
  | {
      type: 'mpEntry';
      rank: number;
      name: string;                  // display name (rendered uppercase)
      memberId?: number;             // links into /mps/[memberId] when present
      party?: string | null;         // optional party tag rendered alongside rank
      topLine: string;               // 'Date: month YYYY. Offence: …'
      paragraphs: string[];
      verdict: string;               // closing verdict line
    };

export type EditorialRegistry = { [slug: string]: EditorialEntry };
