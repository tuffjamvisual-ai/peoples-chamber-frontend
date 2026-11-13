// The database row for one editorial, for scripts/publish-editorial.ts: the only way a piece reaches the editorials table.
import type { Block, EditorialEntry } from '../lib/editorials/types';

export function extractBodyText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'bioLine':
      case 'pullQuote':
      case 'cta':
        parts.push(block.text);
        break;
      case 'heading':
        parts.push(block.text);
        break;
      case 'list':
        parts.push(block.items.join('\n'));
        break;
      case 'statBlock':
        parts.push([block.stat, block.label, block.context].filter(Boolean).join(' '));
        break;
      case 'dataBlock':
        parts.push([block.headlineFigure, block.context].filter(Boolean).join(' '));
        break;
      case 'councilEntry':
        parts.push([block.name, block.topLine, ...block.paragraphs, block.verdict].join(' '));
        break;
      case 'mpEntry':
        parts.push([block.name, block.topLine, ...block.paragraphs, block.verdict].join(' '));
        break;
      // signature: no readable text
    }
  }
  return parts.join('\n\n');
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// evidence.lastChecked is written either as 2026-10-29 or as 29 October 2026; the date, or null if neither.
export function lastCheckedDate(v: string | undefined): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  const mi = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return m && mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// Where a piece sits: its topics, whether it is unpublished, its registry position and its position in each topic.
export type Placement = { topic_slugs: string[]; unpublished: boolean; registry_order: number | null; topic_positions: Record<string, number> };

// The database row for one piece: every EditorialEntry field. An absent optional field is NULL, except the three
// older related_* arrays, which keep their existing convention of an empty array.
export function rowFor(piece: EditorialEntry, place: Placement) {
  return {
    slug:                    piece.slug,
    headline:                piece.headline,
    standfirst:              piece.standfirst,
    summary:                 piece.summary ?? null,
    published_at:            piece.publishedAt,
    author_byline:           piece.authorByline,
    kind:                    piece.kind   ?? null,
    kicker:                  piece.kicker ?? null,
    body_text:               extractBodyText(piece.body),
    body_json:               piece.body as unknown as object,
    related_dept_slugs:      piece.relatedDeptSlugs  ?? [],
    related_member_ids:      piece.relatedMemberIds  ?? [],
    related_bill_ids:        piece.relatedBillIds    ?? [],
    related_council_slugs:   piece.relatedCouncilSlugs ?? [],
    opinion:                 piece.opinion ?? null,
    hero_image:              piece.heroImage ?? null,
    hero_alt:                piece.heroAlt ?? null,
    evidence:                (piece.evidence ?? null) as object | null,
    last_checked:            lastCheckedDate(piece.evidence?.lastChecked),
    update_note:             (piece.updateNote ?? null) as object | null,
    related_programme_slugs: piece.relatedProgrammeSlugs ?? null,
    explore:                 (piece.explore ?? null) as object | null,
    read_next:               piece.readNext ?? null,
    topic_slugs:             place.topic_slugs,
    unpublished:             place.unpublished,
    registry_order:          place.registry_order,
    topic_positions:         place.topic_positions as object,
    // search_vec is GENERATED ALWAYS AS STORED — not supplied in upsert
  };
}
// A stable string of a row's content, for deciding whether updated_at moves.
export function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

// The SQL type of every column a row carries.
export const SQL_TYPES: Record<string, string> = {
  slug: 'text', headline: 'text', standfirst: 'text', summary: 'text', published_at: 'date', author_byline: 'text', kind: 'text',
  kicker: 'text', body_text: 'text', body_json: 'jsonb', related_dept_slugs: 'text[]', related_member_ids: 'int[]',
  related_bill_ids: 'int[]', related_council_slugs: 'text[]', opinion: 'boolean', hero_image: 'text', hero_alt: 'text', evidence: 'jsonb', last_checked: 'date',
  update_note: 'jsonb', related_programme_slugs: 'text[]', explore: 'jsonb', read_next: 'text[]', topic_slugs: 'text[]',
  unpublished: 'boolean', registry_order: 'int', topic_positions: 'jsonb', synced_at: 'timestamptz', updated_at: 'timestamptz',
};

// A dollar quote tag that does not occur in the text.
export function dollarTag(text: string, base = 'editorials_json'): string {
  let tag = base;
  while (text.includes(`$${tag}$`)) tag += '_x';
  return tag;
}
