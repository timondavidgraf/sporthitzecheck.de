import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * `unsafe-inline` bei Skripten ist nötig, weil Next.js seinen Bootstrap inline
 * ausliefert; ein Nonce würde Middleware auf jeder Route erfordern. Der Gewinn
 * bleibt: fremde Skript-Hosts sind ausgeschlossen. In der Entwicklung braucht
 * Turbopack zusätzlich `unsafe-eval`.
 *
 * Externe Ziele: Open-Meteo (Vorhersage und Modell-Archiv für den Rückblick,
 * direkt aus dem Browser) und der
 * OpenStreetMap-Embed. Sentry läuft über einen eigenen Pfad (`/monitoring`)
 * und gilt damit als same-origin. Die Besucherzählung braucht nichts im
 * Browser (proxy.ts, lib/besucherzaehlung.ts).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.open-meteo.com https://historical-forecast-api.open-meteo.com",
  "frame-src https://www.openstreetmap.org",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Version im Response-Header verrät nur Angriffsfläche
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        // Belag-Thumbnails sind unveränderlich – ein Jahr im Browser-Cache
        source: "/surfaces/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "entfaltungszone",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
