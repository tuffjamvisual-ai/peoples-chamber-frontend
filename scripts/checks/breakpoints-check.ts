// Breakpoints check (owner, 8 Nov 2026, RT1): the phone layout has one definition, lib/breakpoints.ts. Fails when
//   a) a .css file's phone query is not word for word what phoneUpTo(), wideFrom() or LANDSCAPE_PHONE give, or
//   b) a phone or desktop switch (max-width 479, 639.98, 640, 760, 767 or 768px; min-width 640, 641, 761 or 768px) is
//      written in any file without the landscape phone part, or
//   c) a component or script checks a phone width by hand (matchMedia('(max-width...'), innerWidth < 640).
// Demo pages that do not use the site shell are left out (DEMO below), and two shell rules whose effect the phone rules
// override (ALLOWED). Reads files only.   npx tsx scripts/checks/breakpoints-check.ts
import fs from 'fs';
import path from 'path';
import { LANDSCAPE_PHONE, phoneUpTo, wideFrom } from '../../lib/breakpoints';

const ROOT = path.join(__dirname, '..', '..');
const DEMO = /^app\/(preview[^/]*|newspaper-[^/]*|land101|landing[^/]*|homepage-v2|newpage|mp121|new2|blank-landing)\//;
const ALLOWED = new Set([
  // The 480 to 640px desk image and the 761 to 1260px nav wrap: on a sideways phone the backdrop is hidden and the nav
  // is replaced by the phone header (opengov-shell.css, the 479px and 767px phone rules come later and win).
  'app/components/opengov-shell.css|@media (min-width: 480px) and (max-width: 640px) {',
  'app/components/opengov-shell.css|@media (min-width: 761px) and (max-width: 1260px) {',
]);
const PHONE_MAX = '(?:479|479\\.98|639\\.98|640|760|767|767\\.98|768)';
const DESK_MIN = '(?:640|641|761|768)';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p, out); }
    else if (/\.(css|tsx?)$/.test(e.name) && !/\.old|\.backup/.test(e.name)) out.push(p);
  }
  return out;
}

const problems: string[] = [];
const files = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))]
  .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter((f) => !DEMO.test(f) && f !== 'lib/breakpoints.ts');

const allowedCss = new Set<string>([LANDSCAPE_PHONE]);
for (const n of ['479', '639.98', '640', '760', '767', '768']) allowedCss.add(phoneUpTo(Number(n)));
for (const n of ['640', '641', '761', '768']) allowedCss.add(wideFrom(Number(n)));

let cssQueries = 0, codeQueries = 0;
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lineOf = (i: number) => src.slice(0, i).split('\n').length;
  if (rel.endsWith('.css')) {
    for (const m of src.matchAll(/@media\s+([^{]+?)\s*\{/g)) {
      const q = m[1];
      const key = `${rel}|${m[0]}`;
      if (ALLOWED.has(key)) continue;
      const switches = new RegExp(`\\((?:max-width:\\s*${PHONE_MAX}|min-width:\\s*${DESK_MIN})px\\)`).test(q);
      const landscape = /orientation:\s*landscape/.test(q);
      if (!switches && !landscape) continue;
      cssQueries++;
      if (!allowedCss.has(q)) problems.push(`${rel}:${lineOf(m.index!)} a) not the shared phone query: @media ${q}`);
    }
  } else {
    // b) a switch width written by hand inside a media query string, and c) hand made width checks.
    for (const m of src.matchAll(new RegExp(`@media\\s*\\((?:max-width:\\s*${PHONE_MAX}|min-width:\\s*${DESK_MIN})px\\)`, 'g'))) problems.push(`${rel}:${lineOf(m.index!)} b) ${m[0]} without the landscape phone part (use phoneUpTo or wideFrom)`);
    for (const m of src.matchAll(new RegExp(`matchMedia\\(\\s*[\`'"]\\((?:max-width:\\s*${PHONE_MAX}|min-width:\\s*${DESK_MIN})px`, 'g'))) problems.push(`${rel}:${lineOf(m.index!)} c) ${m[0]}: use PHONE or phoneUpTo from lib/breakpoints.ts`);
    for (const m of src.matchAll(/innerWidth\s*<\s*\d{3}/g)) problems.push(`${rel}:${lineOf(m.index!)} c) ${m[0]}: use PHONE from lib/breakpoints.ts`);
    codeQueries += (src.match(/\$\{(?:phoneUpTo|wideFrom)\(|matchMedia\((?:PHONE|phoneUpTo)/g) ?? []).length;
  }
}
console.log(`breakpoints: ${cssQueries} queries in .css files, ${codeQueries} in components and scripts built from lib/breakpoints.ts`);
if (problems.length) { for (const p of problems) console.log(`  ${p}`); console.log(`breakpoints: ${problems.length} problem(s)`); process.exit(1); }
console.log('breakpoints: all phone queries use the one definition');
