import type { NextConfig } from "next";
import { departments } from "./lib/departments";
import { DEPARTMENT_SLUGS } from "./lib/url-gone";

// proxy.ts answers 410 for a /departments/<slug> that is not a department (lib/url-gone.ts keeps its own short list so
// the proxy does not load every department's data): the build stops if the two lists ever differ.
{
  const real = departments.map((d) => d.slug).sort().join(",");
  const listed = [...DEPARTMENT_SLUGS].sort().join(",");
  if (real !== listed) throw new Error(`lib/url-gone.ts DEPARTMENT_SLUGS differs from lib/departments: ${listed} vs ${real}`);
}

// Optional: opt-in bundle analyzer. Enable with:
//   npm install -D @next/bundle-analyzer
//   ANALYZE=true npm run build
// Reports open as static HTML under .next/analyze/. Falls back to a
// passthrough when the dep isn't installed, so this config compiles
// cleanly on a fresh checkout.
async function withAnalyzerIfEnabled(cfg: NextConfig): Promise<NextConfig> {
  if (process.env.ANALYZE !== 'true') return cfg;
  try {
    // @ts-ignore — optional dep, not installed by default
    const mod = (await import('@next/bundle-analyzer')) as unknown as {
      default: (opts: { enabled: boolean }) => (c: NextConfig) => NextConfig;
    };
    return mod.default({ enabled: true })(cfg);
  } catch {
    console.warn('[next.config] ANALYZE=true but @next/bundle-analyzer not installed — skipping');
    return cfg;
  }
}

// "Leeds City Council" -> "leeds-city-council" (the old /departments/ slug form).
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Councils used to live at /departments/[slug] before moving to
// /councils/[slug]. The old URLs (slugified council name, e.g.
// "leeds-city-council", and the short slug "leeds") are still indexed by
// Google and now 404. Build a permanent (308) redirect map to their new
// /councils/ home at build time from the councils table. Real central-gov
// department slugs never collide with council names, so legitimate
// /departments pages are unaffected. Falls back to no redirects if the DB
// is unreachable at build (e.g. offline CI) so the build still succeeds.
async function councilRedirects() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/councils?select=slug,name`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.warn(`[next.config] councilRedirects: councils fetch ${res.status} — skipping`);
      return [];
    }
    const rows = (await res.json()) as { slug: string; name: string }[];
    const seen = new Set<string>();
    const out: { source: string; destination: string; permanent: boolean }[] = [];
    for (const c of rows) {
      if (!c.slug) continue;
      for (const src of new Set([slugifyName(c.name), c.slug])) {
        if (!src || seen.has(src)) continue;
        seen.add(src);
        out.push({ source: `/departments/${src}`, destination: `/councils/${c.slug}`, permanent: true });
      }
    }
    return out;
  } catch (err) {
    console.warn('[next.config] councilRedirects failed — skipping:', (err as Error).message);
    return [];
  }
}

// Public bodies that are agencies, not departments (owner's approval, 24 Oct 2026): old /departments/<slug> addresses
// for them 404'd. 301 each to /agencies/<slug>, but only where agency_cache holds that slug (so the agency page has
// something to show) and no department uses it. Built at build time from agency_cache, like the council map above;
// added after the council redirects so those keep their place. No redirects if the DB is unreachable at build.
async function agencyRedirects() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/agency_cache?select=slug`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.warn(`[next.config] agencyRedirects: agency_cache fetch ${res.status} — skipping`);
      return [];
    }
    const rows = (await res.json()) as { slug: string | null }[];
    const deptSlugs = new Set(departments.map((d) => d.slug));
    const slugs = [...new Set(rows.map((r) => r.slug).filter((s): s is string => !!s && /^[a-z0-9-]+$/.test(s) && !deptSlugs.has(s)))];
    // A few alternation patterns rather than one redirect per agency: 230 separate entries would take the redirect
    // count past the 1,000 at which Next.js warns of slower routing. Each pattern is kept under 3,500 characters.
    const groups: string[][] = [[]];
    for (const s of slugs) {
      const g = groups[groups.length - 1];
      if (g.length && g.join('|').length + s.length + 1 > 3500) groups.push([s]);
      else g.push(s);
    }
    return groups.filter((g) => g.length).map((g) => ({ source: `/departments/:slug(${g.join('|')})`, destination: '/agencies/:slug', statusCode: 301 as const }));
  } catch (err) {
    console.warn('[next.config] agencyRedirects failed — skipping:', (err as Error).message);
    return [];
  }
}

const nextConfig: NextConfig = {
  // The recommendations tracker's switch (lib/feature-flags.ts), set at build time so the server and the browser (the
  // menu's current section in HeaderNav) read the same value. Not a secret; a change needs a new deploy.
  env: { RECOMMENDATIONS_PUBLIC: process.env.RECOMMENDATIONS_PUBLIC ?? '' },
  // Build reliability (owner's approval, 21 Oct 2026): two prerender workers instead of one per CPU, so the build does
  // not overload the database (reads queued for over 5 s and timed out at the 3 s limit).
  experimental: { cpus: 2 },
  async redirects() {
    // Editorials moved from descriptive slugs to opaque random slugs.
    // Keep the old indexed URLs alive with permanent (308) redirects.
    const editorialRedirects = [
      {
        source: '/editorials/biggest-westminster-scandals-among-serving-mps-2026',
        destination: '/editorials/kxlkhj1jgj',
        permanent: true,
      },
    ];
    // Briefings moved out of /editorials into their own /briefings section.
    // 301 the three pieces so existing links and search results don't break.
    const briefingRedirects = [
      { source: '/editorials/k3p9w7nx2d', destination: '/briefings/k3p9w7nx2d', statusCode: 301 as const },
      { source: '/editorials/w7q2m9rk5t', destination: '/briefings/w7q2m9rk5t', statusCode: 301 as const },
      { source: '/editorials/r4n8k2wq7m', destination: '/briefings/r4n8k2wq7m', statusCode: 301 as const },
    ];
    // An address Search Console reported as Not found (16 Oct 2026): an old donor-page link that
    // treated a council as a department. (Since 28 Oct 2026 a peer's /mps/<id> goes to their
    // Parliament page from the MP page itself, lib/former-mps.ts, and a debate Hansard no longer
    // holds goes to its sitting day on Hansard from the debate page.)
    const notFoundRedirects = [
      { source: '/departments/london-borough-of-enfield', destination: '/councils/enfield', statusCode: 301 as const },
    ];
    // /bills?page=N moved to /bills/page/N so every page is cached (owner's approval, 21 Oct 2026).
    const billsPageRedirects = [
      { source: '/bills', has: [{ type: 'query' as const, key: 'page', value: '(?<p>[0-9]{1,4})' }], destination: '/bills/page/:p', permanent: true },
    ];
    // Investigations and Briefings merged into Reports (owner's approval, 23 Oct 2026): the two list pages move to
    // /reports (the query string, ?page= included, is passed through). Article and /sources addresses are unchanged.
    const reportsRedirects = [
      { source: '/editorials', destination: '/reports', statusCode: 301 as const },
      { source: '/briefings', destination: '/reports', statusCode: 301 as const },
    ];
    // The two Reform crypto bill reports merged (owner's approval, 24 Oct 2026): the older one, hb9k2xq7mw, and its
    // sources page 301 to q7m3k9xw2r.
    const mergedReportRedirects = [
      { source: '/editorials/hb9k2xq7mw', destination: '/editorials/q7m3k9xw2r', statusCode: 301 as const },
      { source: '/editorials/hb9k2xq7mw/sources', destination: '/editorials/q7m3k9xw2r/sources', statusCode: 301 as const },
    ];
    // MPs, Parties and Departments became groups of Parliament in the menu (owner's decision, 25 Oct 2026, report 62):
    // their section pages go permanently (308) to the matching group on the Parliament section page.
    const sectionRedirects = [
      { source: '/sections/mps', destination: '/sections/parliament#mps', permanent: true },
      { source: '/sections/parties', destination: '/sections/parliament#parties', permanent: true },
      { source: '/sections/departments', destination: '/sections/parliament#departments', permanent: true },
    ];
    // Organisations merged into their lobbying registry page once the registry recorded their Companies House number
    // (owner, 27 Oct 2026, numbers checked on Companies House): the company page, and its record lists, go to the
    // registry page.
    const mergedOrganisations: [string, string][] = [
      ['barnardos-00061625', 'barnardos'],
      ['local-government-association-11177145', 'local-government-association'],
      ['race-equality-foundation-03121679', 'race-equality-foundation'],
      ['refuge-01412276', 'refuge'],
      ['safelives-05203237', 'safelives'],
      ['suzy-lamplugh-trust-02417823', 'suzy-lamplugh-trust'],
    ];
    const organisationRedirects = mergedOrganisations.flatMap(([from, to]) => [
      { source: `/organisations/${from}`, destination: `/organisations/${to}`, permanent: true },
      { source: `/organisations/${from}/:dataset(donations|contracts|grants)`, destination: `/organisations/${to}/:dataset`, permanent: true },
      { source: `/organisations/${from}/opengraph-image`, destination: `/organisations/${to}/opengraph-image`, permanent: true },
    ]);
    return [...editorialRedirects, ...briefingRedirects, ...notFoundRedirects, ...organisationRedirects, ...mergedReportRedirects, ...billsPageRedirects, ...reportsRedirects, ...sectionRedirects, ...(await councilRedirects()), ...(await agencyRedirects())];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'nwnsvnbudmfkhhwcjwwr.supabase.co' },
    ],
    // Override the source's Cache-Control so Vercel holds the optimised
    // image at the edge for a year. Supabase Storage returns no-cache,
    // which would otherwise force re-fetch every minute.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      // Only www.opengovt.uk is indexed (owner, 28 Oct 2026): the vercel.app address and preview deployments carry
      // noindex, so search engines never list a copy. Pages still open normally there.
      {
        source: '/:path*',
        missing: [{ type: 'host' as const, value: 'www.opengovt.uk' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};

export default withAnalyzerIfEnabled(nextConfig);
