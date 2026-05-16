import type { Metadata } from "next";
import { Playfair_Display, Anton, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

// Magazine-template typography stack. Special Elite is loaded via
// @font-face in globals.css and consumed by --font-typewriter.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const SITE_URL = "https://www.thepeopleschamber.uk";
const SITE_NAME = "The Peoples Chamber";
const SITE_DESCRIPTION =
  "The UK politics transparency app — see what every government department controls, what every party says, and who runs Britain.";
const OG_IMAGE = `${SITE_URL}/logo.png`;

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
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
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
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
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
    <html lang="en" className={`${playfair.variable} ${anton.variable} ${oswald.variable} h-full antialiased`}>
      <head>
        {/* Preload the Special Elite font so it's ready when the
         * magazine pages render — skips the 200-300ms fallback flash. */}
        <link
          rel="preload"
          href="/fonts/special-elite.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Preload the three magazine-chrome WebPs. They're set via
         * CSS background-image so the browser only discovers them
         * after stylesheet parse — this gives it a head start. */}
        <link rel="preload" href="/preview-header.webp" as="image" type="image/webp" />
        <link rel="preload" href="/preview-middle.webp" as="image" type="image/webp" />
        <link rel="preload" href="/preview-footer.webp" as="image" type="image/webp" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
