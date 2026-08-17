import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SportHitzeCheck",
    short_name: "HitzeCheck",
    description:
      "Hitze-Ampel für den Sport und Vereine: WBGT-Näherung aus Wetterdaten mit Handlungsempfehlungen.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "de",
    icons: [
      {
        src: "/brand/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
