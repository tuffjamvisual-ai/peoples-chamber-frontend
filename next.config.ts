import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  async redirects() {
    return await councilRedirects();
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
