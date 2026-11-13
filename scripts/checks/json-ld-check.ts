// JSON-LD check (owner's brief, 3 Nov 2026): every structured data block the site's builders make (lib/JsonLd.tsx) is
// serialised exactly as the pages serialise it and must parse back with JSON.parse, with the fields each type needs.
// Runs before every build (package.json "prebuild"); a failure stops the build. No network or database.
// Run by hand: npx tsx scripts/checks/json-ld-check.ts
import {
  serialiseJsonLd, buildSiteGraph, buildMpPerson, buildEditorialArticle, buildBreadcrumbs, buildDonorEntity,
  buildBillLegislation, buildDepartmentOrg, buildTransparencyPage,
} from '../../lib/JsonLd';

// Awkward text on purpose: quotes, an apostrophe, a script end tag, non ASCII and a line break.
const TRICKY = 'O\'Brien "quoted" </script><script>alert(1)</script> Café £5 per cent\nnext line';

type Node = Record<string, unknown>;
const cases: { name: string; data: unknown; needs: (j: Node) => string[] }[] = [
  {
    name: 'site graph (WebSite with SearchAction, Organization)',
    data: buildSiteGraph(),
    needs: (j) => {
      const g = (j['@graph'] as Node[]) ?? [];
      const site = g.find((n) => n['@type'] === 'WebSite');
      const org = g.find((n) => n['@type'] === 'Organization');
      const action = site?.potentialAction as Node | undefined;
      return [
        ...(site ? [] : ['no WebSite']),
        ...(org?.name === 'opengovt' ? [] : ['Organization name is not opengovt']),
        ...(String(action?.target ?? '').endsWith('/search?q={search_term_string}') ? [] : ['SearchAction target']),
      ];
    },
  },
  {
    name: 'MP Person (current)',
    data: buildMpPerson({ memberId: 163, fullName: TRICKY, party: 'Labour', photoUrl: null }),
    needs: (j) => [
      ...(j.jobTitle === 'Member of Parliament' ? [] : ['jobTitle']),
      ...((j.memberOf as Node)?.name === 'Labour' ? [] : ['memberOf']),
      ...((j.affiliation as Node)?.name === 'House of Commons' ? [] : ['affiliation']),
      ...((j.sameAs as string[])?.[0] === 'https://members.parliament.uk/member/163' ? [] : ['sameAs']),
    ],
  },
  {
    name: 'MP Person (former)',
    data: buildMpPerson({ memberId: 1435, fullName: 'Patrick Mercer', party: 'Independent', former: true }),
    needs: (j) => [...(j.jobTitle === undefined && j.memberOf === undefined ? [] : ['a former MP claims a current role']), ...(j.url ? [] : ['url'])],
  },
  {
    name: 'NewsArticle with mentions',
    data: buildEditorialArticle({ slug: 'abc', headline: TRICKY, description: TRICKY, datePublished: '2026-11-03', updateNote: [{ date: '2026-11-05' }], mentions: [{ memberId: 163, name: TRICKY }] }),
    needs: (j) => [
      ...(j.headline && j.datePublished && j.dateModified ? [] : ['headline or dates']),
      ...((j.author as Node)?.name === 'opengovt' ? [] : ['author']),
      ...((j.publisher as Node)?.name === 'opengovt' ? [] : ['publisher']),
      ...(j.mainEntityOfPage ? [] : ['mainEntityOfPage']),
      ...(((j.mentions as Node[]) ?? [])[0]?.url === 'https://www.opengovt.uk/mps/163' ? [] : ['mentions']),
    ],
  },
  { name: 'BreadcrumbList', data: buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: TRICKY, path: '/mps/163' }]), needs: (j) => ((j.itemListElement as unknown[])?.length === 2 ? [] : ['items']) },
  { name: 'donor', data: buildDonorEntity({ slug: 'x', name: TRICKY, individual: true }), needs: () => [] },
  { name: 'Legislation', data: buildBillLegislation({ billId: 1, title: TRICKY, legislationDate: null, isLaw: false, defeated: false, withdrawn: false, sponsorName: TRICKY }), needs: () => [] },
  { name: 'department', data: buildDepartmentOrg({ slug: 'x', name: TRICKY, description: TRICKY, sosName: TRICKY, sosMemberId: 1, sosRole: null }), needs: () => [] },
  { name: 'transparency page', data: buildTransparencyPage({ path: '/x', name: TRICKY, description: TRICKY }), needs: () => [] },
];

let failed = 0;
for (const c of cases) {
  const text = serialiseJsonLd(c.data);
  const problems: string[] = [];
  if (/<\/script/i.test(text)) problems.push('a "</script" survives serialisation');
  let parsed: Node | null = null;
  try { parsed = JSON.parse(text) as Node; } catch (e) { problems.push(`JSON.parse failed: ${(e as Error).message}`); }
  if (parsed) {
    if (parsed['@context'] !== 'https://schema.org') problems.push('@context');
    problems.push(...c.needs(parsed));
    if (JSON.stringify(parsed) !== JSON.stringify(c.data)) problems.push('does not round trip to the same data');
  }
  if (problems.length) { failed++; console.error(`json-ld-check: ${c.name}: ${problems.join('; ')}`); }
}
if (failed) { console.error(`json-ld-check: ${failed} of ${cases.length} blocks failed`); process.exit(1); }
console.log(`json-ld-check: all ${cases.length} JSON-LD blocks parse and carry their required fields`);
