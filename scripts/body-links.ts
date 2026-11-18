// No links inside an article's text (owner rule, 18 Nov 2026, Cowork ENTRY 288 and 289): every source goes only in the
// Sources list folded at the end (evidence.recordsReviewed). scripts/publish-editorial.ts refuses a body in which any text
// holds a link: a [words](address) link, to another site or to an opengovt page, or a bare web address. Fields that are
// addresses by design (a cta button's href, a bioLine's photoHref and photo) are not text and are not checked.
// MP biographies too (owner approved 18 Nov 2026, Cowork ENTRY 295): political_bio holds no link; its sources are in
// bio_sources, folded at the end (scripts/background/delivery-migration.ts uses textLink).
// An address may hold balanced brackets (Hansard: ...Bill(Lords)(FirstSitting)).
const LINK = /\[[^\]]+\]\((?:[^()\s]|\([^()\s]*\))+\)/;
const BARE = /\bhttps?:\/\/\S+|\bwww\.[a-z0-9-]+\.[a-z]\S*/i;
const NOT_TEXT = new Set(['href', 'photoHref', 'photo', 'photoAlt', 'type', 'level']);

// The first link in one piece of text, or null.
export function textLink(s: string): string | null {
  const m = s.match(LINK) ?? s.match(BARE);
  return m ? m[0].slice(0, 80) : null;
}

export function bodyLinks(body: unknown[]): string[] {
  const out: string[] = [];
  const walk = (v: unknown, where: string) => {
    if (typeof v === 'string') {
      const hit = textLink(v);
      if (hit) out.push(`${where}: "${hit}"`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!NOT_TEXT.has(k)) walk(x, `${where}.${k}`);
  };
  body.forEach((block, i) => walk(block, `body[${i}]`));
  return out;
}
