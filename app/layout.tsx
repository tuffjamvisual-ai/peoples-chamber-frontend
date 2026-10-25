import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import SoftRegisterPrompt from "./components/SoftRegisterPrompt";
import FloatingScrollDownButton from "./components/FloatingScrollDownButton";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  display: "swap",
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
  "The UK politics transparency app. See what every government department controls, what every party says, and who runs Britain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
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
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
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
  description: SITE_DESCRIPTION,
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
    <html lang="en" className={`${bebas.variable} ${specialElite.variable} h-full antialiased`}>
      <head>
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
        <AuthProvider>
          {children}
          <SoftRegisterPrompt />
        </AuthProvider>
        {/* Floating jump-to-bottom arrow on every page (styled like the Claude chat app's). */}
        <FloatingScrollDownButton />
        <Analytics />
        {/* Speed Insights, free tier only (owner's approval, 21 Oct 2026): one visit in five is sampled to stay under
         * the 10,000 events a rolling 30 days allows; Speed Insights Plus is not enabled. */}
        <SpeedInsights sampleRate={0.2} />
      </body>
    </html>
  );
}
