import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SentryClientInit } from "@/lib/SentryClientInit";
import { SiteFooter } from "@/lib/SiteFooter";
import { SITE_URL } from "@/lib/legal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Hitze-Ampel für Sport und Vereine: WBGT-Näherung aus Wetterdaten, Untergrund und Beschattung – mit Handlungsempfehlungen nach Verbandsrichtlinien.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SportHitzeCheck – Hitze-Ampel für den Sportplatz",
    template: "%s – SportHitzeCheck",
  },
  description: DESCRIPTION,
  applicationName: "SportHitzeCheck",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_URL,
    siteName: "SportHitzeCheck",
    title: "SportHitzeCheck – Hitze-Ampel für den Sportplatz",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "SportHitzeCheck – Hitze-Ampel für den Sportplatz",
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
        <SentryClientInit />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
