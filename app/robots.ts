import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /radar existiert nur mit Query-Parametern und hat ohne sie keinen
        // eigenen Inhalt; /monitoring ist der Sentry-Tunnel
        disallow: ["/radar", "/monitoring"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
