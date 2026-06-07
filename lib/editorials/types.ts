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
  // Body is a sequence of blocks; the renderer dispatches by `type`.
  body: Block[];
};

export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'pullQuote'; text: string }
  | {
      type: 'councilEntry';
      rank: number;
      name: string;                  // display name (rendered uppercase)
      councilSlug?: string;          // links into /councils/[slug] when present
      topLine: string;               // 'Section 114 notice: June 2023. Deficit: £1.2 billion against a £16 million annual budget.'
      paragraphs: string[];
      verdict: string;               // closing verdict line
    };

export type EditorialRegistry = { [slug: string]: EditorialEntry };
