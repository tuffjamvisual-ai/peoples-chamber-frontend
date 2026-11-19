// Tests for the push fast lane rule (scripts/checks/fast-lane.mjs, Cowork ENTRY 404): fake file lists and a fake import
// graph, no git. Run: node --test scripts/checks/fast-lane.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibility, councilsFromDiff, specifiers, resolveSpecifier, importersOf, allImporters, routeOfShareFile, pngSize, summaryLine } from './fast-lane.mjs';

const EXAMPLES = {
  '/editorials/[slug]': '/editorials/upk2tz9zw9',
  '/organisations/[slug]': '/organisations/british-science-association',
  '/bills/[id]': '/bills/657',
  '/councils/[slug]': '/councils/derry-city-and-strabane',
  '/briefings/[slug]': '/briefings/920e6b2857',
};
// The share image code as on main (19 Nov 2026), plus a page.
const SOURCES = {
  'app/opengraph-image.tsx': "import { brandCard } from '@/lib/og/brand-card';\nexport default () => brandCard();",
  'app/bills/[id]/opengraph-image.tsx': "import { ogCard } from '@/lib/og-card';\nimport { supabase } from '@/lib/supabase';",
  'app/this-week/opengraph-image.tsx': "import { ogCard } from '@/lib/og-card';",
  'lib/og-card.tsx': "import { ImageResponse } from 'next/og';\nimport { handled } from './settle';\nimport { Stamp, bebasFont } from './og/stamp';",
  'lib/og/brand-card.tsx': "import { Stamp, bebasFont } from './stamp';",
  'lib/og/stamp.tsx': "import { handled } from '../settle';",
  'lib/settle.ts': 'export const handled = (p) => p;',
  'lib/supabase.ts': 'export const supabase = {};',
  'app/bills/[id]/page.tsx': "import { supabase } from '@/lib/supabase';",
  'app/page.tsx': "import x from './components/Home';",
  'app/components/Home.tsx': 'export default 1;',
};

function fakeRepo({ changes, messages = ['A change'], sources = SOURCES, used = {}, diff = '', slugs = ['flintshire', 'kent', 'isles-of-scilly', 'newcastle'] }) {
  return {
    changes: () => changes.map(([status, ...paths]) => ({ status, paths })),
    messages: () => messages,
    sources: () => new Map(Object.entries(sources)),
    nameUsedIn: (_h, name) => used[name] ?? [],
    fileDiff: () => diff,
    councilSlugs: () => slugs,
    examplePage: (_h, route) => EXAMPLES[route] ?? null,
  };
}
const run = (o) => eligibility({ base: 'base', head: 'head', repo: fakeRepo(o) });

test('a share image route only: fast, its own page and image', () => {
  const r = run({ changes: [['M', 'app/bills/[id]/opengraph-image.tsx']] });
  assert.equal(r.fast, true, r.reasons.join('; '));
  assert.deepEqual(r.kinds, ['share image route']);
  assert.deepEqual(r.samples.pages, ['/bills/657']);
  assert.deepEqual(r.samples.imageRoutes, ['/bills/657/opengraph-image']);
  assert.equal(r.samples.everyKind, false);
  assert.equal(summaryLine(r), 'FAST LANE: 1 files (share image route)');
});

test('the root share image: page / and /opengraph-image', () => {
  const r = run({ changes: [['M', 'app/opengraph-image.tsx']] });
  assert.equal(r.fast, true);
  assert.deepEqual(r.samples.pages, ['/']);
  assert.deepEqual(r.samples.imageRoutes, ['/opengraph-image']);
});

test('a helper imported only by share routes (through another helper): fast, every kind sampled', () => {
  const r = run({ changes: [['M', 'lib/og/stamp.tsx']] });
  assert.equal(r.fast, true, r.reasons.join('; '));
  assert.equal(r.samples.everyKind, true);
  assert.equal(r.samples.pages.length, 7);
  assert.deepEqual(new Set(r.samples.pages), new Set(['/', '/editorials/upk2tz9zw9', '/organisations/british-science-association', '/bills/657', '/councils/derry-city-and-strabane', '/this-week', '/briefings/920e6b2857']));
  assert.ok(r.samples.imageRoutes.includes('/opengraph-image'));
  assert.ok(r.samples.imageRoutes.includes('/briefings/920e6b2857/opengraph-image'));
});

test('a helper imported by a page at depth 2: full', () => {
  // lib/og/stamp.tsx -> lib/og-card.tsx -> app/components/Card.tsx -> app/page.tsx
  const sources = { ...SOURCES, 'app/components/Card.tsx': "export { ogCard } from '../../lib/og-card';", 'app/page.tsx': "import { ogCard } from './components/Card';" };
  const r = run({ changes: [['M', 'lib/og/stamp.tsx']], sources });
  assert.equal(r.fast, false);
  assert.match(r.reasons.join('; '), /lib\/og\/stamp\.tsx is imported by .*app\/components\/Card\.tsx/);
  assert.match(r.reasons.join('; '), /app\/page\.tsx/);
});

test('a static image whose name appears in a .tsx: full', () => {
  const r = run({ changes: [['M', 'public/resigned-stamp.png']], used: { 'resigned-stamp.png': ['app/departments/[slug]/DepartmentMasthead.tsx'] } });
  assert.equal(r.fast, false);
  assert.match(r.reasons[0], /resigned-stamp\.png appears in app\/departments\/\[slug\]\/DepartmentMasthead\.tsx/);
});

test('a static image named in a .css file: full', () => {
  const r = run({ changes: [['M', 'public/folders-1280.webp']], used: { 'folders-1280.webp': ['app/globals.css'] } });
  assert.equal(r.fast, false);
});

test('a new image named nowhere: fast, the file itself fetched', () => {
  const r = run({ changes: [['A', 'public/images/new-chart.png']] });
  assert.equal(r.fast, true, r.reasons.join('; '));
  assert.deepEqual(r.kinds, ['static image']);
  assert.deepEqual(r.samples.staticFiles, ['/images/new-chart.png']);
  assert.deepEqual(r.samples.pages, []);
});

test('"Layout change approved" in an earlier commit of the range: full', () => {
  const r = run({ changes: [['M', 'app/opengraph-image.tsx']], messages: ['Share image tweak', 'Header spacing (Layout change approved, T2-MOB-B3)', 'First'] });
  assert.equal(r.fast, false);
  assert.match(r.reasons[0], /Layout change approved/);
});

test('a css change: full, the reason names it', () => {
  const r = run({ changes: [['M', 'app/opengraph-image.tsx'], ['M', 'app/globals.css']] });
  assert.equal(r.fast, false);
  assert.deepEqual(r.reasons, ['app/globals.css']);
  assert.equal(summaryLine(r), 'FULL: app/globals.css');
});

test('deleting an app file: full', () => {
  const r = run({ changes: [['D', 'app/mps/page.tsx']] });
  assert.equal(r.fast, false);
  assert.match(r.reasons[0], /deletes app\/mps\/page\.tsx/);
});

test('deleting a share image route or an unused asset: fast', () => {
  const r = run({ changes: [['D', 'app/mps/opengraph-image.tsx'], ['D', 'public/og/stamp.png']] });
  assert.equal(r.fast, true, r.reasons.join('; '));
  assert.equal(r.samples.everyKind, true);
});

test('a rename: both paths must qualify', () => {
  assert.equal(run({ changes: [['R', 'public/og/a.png', 'public/og/b.png']] }).fast, true);
  const r = run({ changes: [['R', 'lib/og/x.tsx', 'lib/x.tsx']] });
  assert.equal(r.fast, false);
  assert.deepEqual(r.reasons, ['lib/x.tsx']);
});

test('a by-election change: fast, the council page the diff names', () => {
  const diff = "@@ -10 +10 @@\n-  if (slug === 'flintshire') return 1;\n+  if (slug === 'flintshire') return 2;\n";
  const r = run({ changes: [['M', 'lib/council-byelections.ts']], diff });
  assert.equal(r.fast, true, r.reasons.join('; '));
  assert.deepEqual(r.kinds, ['by-election list']);
  assert.deepEqual(r.samples.pages, ['/councils/flintshire']);
  assert.deepEqual(r.samples.imageRoutes, []);
});

test('a by-election change naming no council: the audit council page, with a note', () => {
  const r = run({ changes: [['M', 'lib/council-byelections.ts']], diff: "@@ -1 +1 @@\n-const a = 1;\n+const a = 2;\n" });
  assert.equal(r.fast, true);
  assert.deepEqual(r.samples.pages, ['/councils/derry-city-and-strabane']);
  assert.match(r.notes[0], /names no council/);
});

test('newsletter issues and robots.txt: fast', () => {
  const r = run({ changes: [['A', 'public/newsletter/2026-11-20.md'], ['M', 'public/robots.txt']] });
  assert.equal(r.fast, true);
  assert.deepEqual(r.samples.staticFiles, ['/newsletter/2026-11-20.md', '/robots.txt']);
});

test('files that always force the full check', () => {
  for (const f of ['lib/search-content.ts', 'app/api/newsletter/send-issue/route.ts', 'next.config.ts', 'proxy.ts', 'package.json', 'vercel.json', 'scripts/checks/fast-lane.mjs', 'public/fonts/special-elite.ttf', 'app/api/x/opengraph-image.tsx']) {
    const r = run({ changes: [['M', f]] });
    assert.equal(r.fast, false, f);
  }
});

test('helpers: specifiers, resolution, importers, routes, PNG size, council names', () => {
  assert.deepEqual(specifiers("import a from 'x';\nexport { b } from \"./y\";\nimport './z.css';\nconst c = await import('@/lib/w');"), ['x', './y', './z.css', '@/lib/w']);
  const files = new Set(['lib/og/stamp.tsx', 'lib/og-card.tsx', 'lib/x/index.ts']);
  assert.equal(resolveSpecifier('lib/og-card.tsx', './og/stamp', files), 'lib/og/stamp.tsx');
  assert.equal(resolveSpecifier('app/a.tsx', '@/lib/x', files), 'lib/x/index.ts');
  assert.equal(resolveSpecifier('app/a.tsx', 'next/og', files), null);
  const rev = importersOf(new Map(Object.entries(SOURCES)));
  assert.deepEqual(allImporters('lib/og/stamp.tsx', rev), ['app/bills/[id]/opengraph-image.tsx', 'app/opengraph-image.tsx', 'app/this-week/opengraph-image.tsx', 'lib/og-card.tsx', 'lib/og/brand-card.tsx']);
  assert.deepEqual(routeOfShareFile('app/(site)/bills/[id]/twitter-image.tsx'), { route: '/bills/[id]', image: 'twitter-image' });
  const png = Buffer.alloc(24); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png); png.write('IHDR', 12, 'latin1'); png.writeUInt32BE(1200, 16); png.writeUInt32BE(630, 20);
  assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
  assert.equal(pngSize(Buffer.from('not a png at all, not at all')), null);
  assert.deepEqual(councilsFromDiff('+// Isles of Scilly: no by-elections\n+// Newcastle upon Tyne maps to newcastle\n-x\n', ['isles-of-scilly', 'newcastle', 'kent']), ['isles-of-scilly', 'newcastle']);
  assert.deepEqual(councilsFromDiff('+const kentish = 1;\n context kent\n', ['kent']), []);
});
