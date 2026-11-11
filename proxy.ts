import type { NextProxy } from "next/server";
import { eintragAus, melden } from "./lib/besucherzaehlung";

/**
 * Besucherzählung nach dem Zählstandard (lib/besucherzaehlung.ts): meldet
 * Seitenabrufe nach der Antwort an den Zähldienst. Ohne STATS_INGEST_URL und
 * STATS_INGEST_TOKEN (lokal, Vorschau-Deployments) passiert nichts.
 */
export const proxy: NextProxy = (request, event) => {
  const ziel = process.env.STATS_INGEST_URL;
  const token = process.env.STATS_INGEST_TOKEN;
  if (!ziel || !token) return;
  const eintrag = eintragAus(request);
  if (eintrag) event.waitUntil(melden(eintrag, ziel, token));
};

export const config = {
  matcher: [
    {
      // Seiten, nicht: API, Next-Interna, Sentry-Tunnel, Bilder und Metadaten-Dateien
      source:
        "/((?!api|_next|_vercel|monitoring|surfaces|sentry-example|favicon\\.ico|icon\\.png|apple-icon\\.png|opengraph-image|twitter-image|manifest\\.webmanifest|sitemap\\.xml|robots\\.txt).*)",
      // Vorab geladene Seiten hat niemand angesehen
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
