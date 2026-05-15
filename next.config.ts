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

const nextConfig: NextConfig = {
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
