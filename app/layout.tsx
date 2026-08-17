import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SentryClientInit } from "@/lib/SentryClientInit";
import { SiteFooter } from "@/lib/SiteFooter";
import { LEGAL_OPERATOR, SITE_URL } from "@/lib/legal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const PAGE_TITLE = "Hitze-Ampel für den Sport und Vereine";
const DESCRIPTION =
  "Hitze-Ampel für den Sport und Vereine: WBGT-Näherung aus Wetterdaten, Untergrund und Beschattung – mit Handlungsempfehlungen nach Verbandsrichtlinien.";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "SportHitzeCheck",
      alternateName: PAGE_TITLE,
      url: SITE_URL,
      inLanguage: "de",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "SportHitzeCheck",
      alternateName: PAGE_TITLE,
      url: SITE_URL,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      inLanguage: "de",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: LEGAL_OPERATOR.name,
      url: SITE_URL,
      email: LEGAL_OPERATOR.email,
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PAGE_TITLE,
    template: "%s – SportHitzeCheck",
  },
  description: DESCRIPTION,
  applicationName: "SportHitzeCheck",
  keywords: [
    "Hitze-Ampel",
    "WBGT",
    "Sport",
    "Verein",
    "Hitzeschutz",
    "Fußball",
    "Sportplatz",
    "SportHitzeCheck",
  ],
  authors: [{ name: LEGAL_OPERATOR.name, url: SITE_URL }],
  creator: LEGAL_OPERATOR.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_URL,
    siteName: "SportHitzeCheck",
    title: PAGE_TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/brand/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SentryClientInit />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
