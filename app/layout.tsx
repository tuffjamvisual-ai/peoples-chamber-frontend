import PhoneEnhance from './components/PhoneEnhance';
import NavTrail from './components/NavTrail';
import { PHONE_ENHANCE_JS } from '@/lib/phone-enhance';
import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import { buildSiteGraph, serialiseJsonLd } from '@/lib/JsonLd';
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import FloatingScrollDownButton from "./components/FloatingScrollDownButton";
import DeferredAnalytics from "./components/DeferredAnalytics";
import CookieBanner from "./components/CookieBanner";
import SkipLink from "./components/SkipLink";
import PostHogLoader from "./components/PostHogLoader";
import { CONSENT_HEAD_SCRIPT } from "@/lib/cookie-consent";
import { phoneUpTo } from '@/lib/breakpoints';

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

// Phones (owner, 4 Nov 2026). In the page itself, so these can never arrive without the markup, and nothing here applies
// from 640px up. Under 640px, long reading text (paragraphs, list text, descriptions) is in system serif fonts, nothing
// downloaded; Special Elite stays for headings, labels, stamps, buttons, navigation, tables and the footer. Under 480px, also the
// homepage intro's sentences as separate paragraphs, and the torn paper strip under the header at half its height.
// Under 640px and inside a page's own <header> too since 4 Nov 2026 (owner): long introductions were still in the typewriter font.
const BODY_TEXT = ':is(p, li, blockquote, dd, figcaption, .og-read):not(nav *, footer *, button *, table *, form *, .og-cookie-banner *, .og-kicker, .og-record-date, [class*="stamp"], [style*="uppercase"], [style*="small-caps"], [style*="0.3em"])';
const PHONE_CSS = `@media ${phoneUpTo(639.98)} {
  ${BODY_TEXT} { font-family: Georgia, "Times New Roman", serif !important; font-size: 17px !important; line-height: 1.6 !important; letter-spacing: normal !important; text-shadow: none !important; }
  ${BODY_TEXT} :is(span, a, strong, em, b, i, time, small, cite, q, div):not([style*="font-family"], [style*="uppercase"], [class*="stamp"]) { font-size: inherit !important; letter-spacing: normal !important; }
  ${BODY_TEXT} [style*="uppercase"] { font-family: var(--font-special-elite), monospace !important; font-size: 15px !important; }
}
@media ${phoneUpTo(479)} {
  .dossier-frame .d-top { aspect-ratio: 1023 / 80 !important; }
}`;

// WebSite (with its SearchAction) and Organization, on every page (lib/JsonLd.tsx buildSiteGraph, 3 Nov 2026).
const JSON_LD = buildSiteGraph();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: CONSENT_HEAD_SCRIPT may add og-cookies-set to <html> before React hydrates.
    <html lang="en" className={`${bebas.variable} ${specialElite.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: PHONE_CSS }} />
        {/* Cookie consent (29 Oct 2026): marks a visitor who has already chosen, before the first paint, so the
         * banner is hidden by CSS and never moves the page (lib/cookie-consent.ts). */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_HEAD_SCRIPT }} />
        {/* JavaScript is on: html.og-js. Rules that hide content behind a control name it, so without JavaScript nothing is lost. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('og-js')" }} />
        {/* RSS feed discovery — Reader apps, GSC and aggregators read this. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="opengovt, Recent Updates"
          href="/feed.xml"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialiseJsonLd(JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* The first thing a keyboard reaches on every page (owner, 8 Nov 2026, A11Y1): hidden until focused, then shown at
            the top left. It moves focus to the page's own content, <main id="main-content"> (OpenGovShell.tsx). */}
        <SkipLink />
        {/* GOV.UK style cookie banner, first after the skip link so keyboard users reach it next (owner, 29 Oct 2026). */}
        <CookieBanner />
        <AuthProvider>
          {children}
          {/* Newsletter strip hidden (owner, 31 Oct 2026); the component is kept in app/components/NewsletterStrip.tsx to bring back later. */}
        </AuthProvider>
        {/* Phones under 640px: tables as cards, lone links as tap targets, long lists shortened (lib/phone-enhance.ts). */}
        <script dangerouslySetInnerHTML={{ __html: PHONE_ENHANCE_JS }} />
        <PhoneEnhance />
        {/* The pages this tab has shown, so the back arrow knows when the previous page is one of ours (BackLink.tsx). */}
        <NavTrail />
        {/* Floating jump-to-bottom arrow on every page (styled like the Claude chat app's). */}
        <FloatingScrollDownButton />
        {/* Web Analytics and Speed Insights, loaded on the visitor's first real interaction. */}
        <DeferredAnalytics />
        {/* PostHog page by page tracking, loaded only after a visitor accepts additional cookies. */}
        <PostHogLoader />
      </body>
    </html>
  );
}
