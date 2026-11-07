// The house style check for hyphens and dashes in our wording (scripts/publish-editorial.ts). Quotations, --allow names and
// addresses are exempt. An address is any link target (owner, 7 Nov 2026): a full URL, an href, a markdown link's address,
// or a bare site path starting with "/", such as /councils/north-northamptonshire. The visible wording of a link is still checked.
const DASH = /[-‐-―−]/;

export function strayDash(text: string, allow: string[] = []): string | null {
  let t = text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\]\([^)\s]*\)/g, '] ')
    .replace(/\bhref\s*=\s*("[^"]*"|'[^']*')/gi, ' ')
    .replace(/(^|[\s([{])\/[^\s)\]}"'<>,;]*/g, '$1 ')
    .replace(/"[^"]*"/g, '""')
    .replace(/“[^”]*”/g, '“”');
  for (const name of allow) t = t.split(name).join(' ');
  const m = DASH.exec(t);
  return m ? t.slice(Math.max(0, m.index - 30), m.index + 30) : null;
}
