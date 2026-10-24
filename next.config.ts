import type { NextConfig } from "next";
import { departments } from "./lib/departments";

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
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    // Three addresses Search Console reported as Not found (16 Oct 2026): an old donor-page link
    // that treated a council as a department, a peer (Lord Rowe-Beddoe, no MP page) and a
    // debate no longer in the archive. Each goes to the page that now covers it.
    const notFoundRedirects = [
      { source: '/departments/london-borough-of-enfield', destination: '/councils/enfield', statusCode: 301 as const },
      { source: '/mps/3806', destination: '/mps', statusCode: 301 as const },
      { source: '/debates/d0c004a3-7ec2-451d-8ae1-bf32a1165e98', destination: '/debates', statusCode: 301 as const },
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
    return [...editorialRedirects, ...briefingRedirects, ...notFoundRedirects, ...mergedReportRedirects, ...billsPageRedirects, ...reportsRedirects, ...(await councilRedirects()), ...(await agencyRedirects())];
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
