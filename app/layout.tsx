import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import FloatingScrollDownButton from "./components/FloatingScrollDownButton";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CookieBanner from "./components/CookieBanner";
import PostHogLoader from "./components/PostHogLoader";
import { CONSENT_HEAD_SCRIPT } from "@/lib/cookie-consent";

// Special Elite (body copy) is loaded once here by next/font (25 Oct 2026, report 46): it preloads the font and adds a
// fallback face sized to match it (adjustFontFallback), so text shown before the font arrives takes the same space and
// does not jump when it swaps in (it moved by up to 0.17 CLS on a first visit). Pages name it through
// var(--font-special-elite). next/font/local with the site's own file, as before (next/font/google serves the same
// face in "latin" subsets).
// The old @font-face in globals.css stays only for the demo pages, which still name "Special Elite" directly; a browser
// fetches it only when a page uses that name.
// Bebas Neue (the masthead stamp, on every page) is self-hosted by next/font instead of a render-blocking
// Google Fonts @import (owner's approval, 21 Oct 2026). Playfair Display, Anton, Oswald and Abril Fatface
// were preloaded on every page but used by no live page, so they are no longer loaded.
const specialElite = localFont({
  src: "../public/fonts/special-elite.woff2",
  variable: "--font-special-elite",
  weight: "400",
  style: "normal",
  // "optional", not "swap" (26 Oct 2026): a late swap moved text when the font arrived (layout shift 0.053 on
  // /parties at 414 px). With the preload the font is normally ready for the first paint; if it is not, that page keeps
  // the size-matched fallback and the font is used from the next page on. "Times New Roman" and Courier New fallbacks
  // were tried and made the shift larger.
  display: "optional",
  preload: true,
  // The size-matched fallback is defined in globals.css ("Special Elite Fallback"), limited to the characters the font
  // has: next/font's own fallback face covered every character, so arrows the font lacks (← →) were drawn from it,
  // larger than before, instead of from each font stack's next font.
  adjustFontFallback: false,
  fallback: ["Special Elite Fallback"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const SITE_URL = "https://www.opengovt.uk";
const SITE_NAME = "opengovt";
// The WebSite JSON-LD description, the same as the Organization's in lib/JsonLd.tsx (owner, 30 Oct 2026).
const JSON_LD_DESCRIPTION = "Independent UK Parliament tracker and government transparency record.";
const SITE_DESCRIPTION =
  "opengovt: independent UK Parliament tracker and government transparency record.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // No canonical here (28 Oct 2026, Search Console): set in this layout it was inherited by every page without its
  // own, so those pages named the homepage as their canonical (and the 404 page too). The homepage sets its own; any
  // other page either sets one or has none, which search engines read as itself.
  // Link previews (25 Oct 2026, report 63): no title, description or url here, so Next.js fills og:title,
  // og:description, twitter:title and twitter:description from each page's own title and description (its
  // generateMetadata or metadata, lib/seo-title.ts, lib/page-descriptions.ts), and links to a page are not all
  // previewed as the homepage. A page without a description of its own still gets SITE_DESCRIPTION through the
  // description above. The image is the site's default; investigations set their own.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${SITE_URL}/og-image.png`],
  },
  // App icons (owner, 30 Oct 2026): apple-icon.png is the header wordmark (OpenGovShell.tsx brandStyle), one line in
  // its stamp, rendered from HTML with the site's Bebas Neue; at 32px and below "OG" in the same stamp, where the full
  // wordmark is not legible. app/favicon.ico (16 and 32px) is the same "OG" stamp, for browsers that ask for /favicon.ico.
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "1m7ftA7GtW7sewElZ7sD-U0_WEnbNG-i-bOr5kah9qI",
    other: {
      // Bing Webmaster Tools. Keep permanently — Bing re-verifies
      // periodically and silently de-verifies the property if the tag
      // disappears. Renders in <head> as
      //   <meta name="msvalidate.01" content="..." />
      "msvalidate.01": "182B7BB55508F332B8A7201B7D1E19A7",
    },
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["Open Govt", "OpenGovt", "opengovt.uk"],
  url: SITE_URL,
  description: JSON_LD_DESCRIPTION,
  inLanguage: "en-GB",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  about: [
    { "@type": "Thing", name: "UK politics" },
    { "@type": "Thing", name: "UK government transparency" },
    { "@type": "Thing", name: "Members of Parliament" },
    { "@type": "Thing", name: "Government departments" },
  ],
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: CONSENT_HEAD_SCRIPT may add og-cookies-set to <html> before React hydrates.
    <html lang="en" className={`${bebas.variable} ${specialElite.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Cookie consent (29 Oct 2026): marks a visitor who has already chosen, before the first paint, so the
         * banner is hidden by CSS and never moves the page (lib/cookie-consent.ts). */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_HEAD_SCRIPT }} />
        {/* RSS feed discovery — Reader apps, GSC and aggregators read this. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="opengovt, Recent Updates"
          href="/feed.xml"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* GOV.UK style cookie banner, first on the page so keyboard users reach it first (owner, 29 Oct 2026). */}
        <CookieBanner />
        <AuthProvider>
          {children}
          {/* Newsletter strip hidden (owner, 31 Oct 2026); the component is kept in app/components/NewsletterStrip.tsx to bring back later. */}
        </AuthProvider>
        {/* Floating jump-to-bottom arrow on every page (styled like the Claude chat app's). */}
        <FloatingScrollDownButton />
        <Analytics />
        {/* Speed Insights, free tier only (owner's approval, 21 Oct 2026): one visit in five is sampled to stay under
         * the 10,000 events a rolling 30 days allows; Speed Insights Plus is not enabled. */}
        <SpeedInsights sampleRate={0.2} />
        {/* PostHog page by page tracking, loaded only after a visitor accepts additional cookies. */}
        <PostHogLoader />
      </body>
    </html>
  );
}
