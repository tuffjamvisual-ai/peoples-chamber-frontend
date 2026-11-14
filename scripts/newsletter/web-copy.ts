// The web copy of one issue of opengovt Weekly, for the email's "View in your browser" link (T1-NLDESIGN, owner
// approved 14 Nov 2026, COWORK-TO-T1 ENTRY 80). Writes public/newsletter/issues/<date>.html: the same design and
// words as the email, with no link to itself, noindex, and its Unsubscribe link going to the newsletter page (a web copy
// belongs to no subscriber). Push it with the issue's pictures; the send route shows the link only once it is live.
//   npx tsx --tsconfig tsconfig.json scripts/newsletter/web-copy.ts <issue.md> --date 2026-11-15 --people "Danny Kruger=4858"
// Each --people name is checked against the Members API, as in send-issue.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { parseIssue, emailFor } from '../../lib/newsletter-issue';

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const file = args.find((a) => a.endsWith('.md'));
const date = opt('--date');
if (!file || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('Give the issue file (.md) and --date YYYY-MM-DD.'); process.exit(1); }

async function main() {
  const people: { name: string; id: number }[] = [];
  for (const pair of (opt('--people') ?? '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const [name, idText] = pair.split('=').map((x) => x.trim());
    const id = Number(idText);
    const m = await fetch(`https://members-api.parliament.uk/api/Members/${id}`);
    const official = m.ok ? ((await m.json()) as { value?: { nameDisplayAs?: string } }).value?.nameDisplayAs : undefined;
    if (!official || official.toLowerCase() !== name.toLowerCase()) throw new Error(`Members API id ${id} is "${official ?? 'not found'}", not "${name}"`);
    people.push({ name, id });
    await new Promise((r) => setTimeout(r, 1000));
  }
  const issue = parseIssue(fs.readFileSync(file!, 'utf8'));
  const { html } = emailFor(issue, '', '', date, people, { web: true });
  const out = path.join(process.cwd(), 'public/newsletter/issues', `${date}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Web copy written: ${path.relative(process.cwd(), out)} (${html.length} bytes; ${people.length} caricatures).`);
}
main().catch((e) => { console.error(`Stopped: ${(e as Error).message}`); process.exit(1); });
