/**
 * Besucherzählung nach dem gemeinsamen Zählstandard 1.0 (ZAEHLSTANDARD.md im
 * Projektordner) – ohne Skript im Browser, ohne Cookie.
 *
 * Vercel hat keinen dauerhaften Speicher. Deshalb meldet `proxy.ts` jeden
 * Seitenabruf serverseitig an den Zähldienst auf dem ehrenwert.app-Server
 * (POST /stats/annahme, eigenes Token). Der Dienst rechnet daraus die
 * Tageskennung, Besuche und Herkunft und speichert nur Tagessummen; die
 * IP-Adresse verlässt Vercel nur in dieser einen Meldung an unseren eigenen
 * Server und wird dort nicht gespeichert.
 *
 * Gemeldet werden nur die Kopfzeilen, die der Zähldienst braucht.
 */

/** Kopfzeilen, die der Zähldienst auswertet – sonst nichts. */
export const GEMELDETE_KOPFZEILEN = [
  "user-agent",
  "accept",
  "accept-language",
  "accept-encoding",
  "sec-fetch-dest",
  "referer",
  "sec-gpc",
  "dnt",
  "sec-purpose",
  "purpose",
] as const;

export type Eintrag = {
  ts: number;
  status: number;
  request: {
    host: string;
    method: string;
    uri: string;
    client_ip: string;
    headers: Record<string, string[]>;
  };
};

type Anfrage = {
  method: string;
  url: string;
  headers: Headers;
};

/**
 * Ist das ein Seitenabruf, den ein Mensch sieht?
 *  - eine ganze Seite (Sec-Fetch-Dest: document) oder
 *  - ein Seitenwechsel im Browser über den Next.js-Router: ein fetch() auf
 *    dieselbe Adresse, der die Seite als RSC-Daten holt (Accept enthält
 *    text/x-component). Vorab geladene Seiten schließt schon der Matcher in
 *    proxy.ts aus (Kopfzeile next-router-prefetch).
 */
export function seitenArt(anfrage: Anfrage): "dokument" | "navigation" | null {
  if (anfrage.method !== "GET") return null;
  const dest = anfrage.headers.get("sec-fetch-dest") ?? "";
  if (dest === "document") return "dokument";
  const accept = anfrage.headers.get("accept") ?? "";
  if (dest === "empty" && accept.includes("text/x-component")) return "navigation";
  // Ältere Browser ohne Sec-Fetch-*: eine HTML-Anfrage gilt als Seite;
  // der Zähldienst sortiert Programme, die nur so tun, selbst aus.
  if (dest === "" && accept.includes("text/html")) return "dokument";
  return null;
}

function clientIp(headers: Headers): string {
  const echt = headers.get("x-real-ip");
  if (echt) return echt.trim();
  return (headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
}

/** Baut den Eintrag in der Form einer Caddy-Logzeile, wie ihn /stats/annahme erwartet. */
export function eintragAus(anfrage: Anfrage, jetzt: number = Date.now()): Eintrag | null {
  const art = seitenArt(anfrage);
  if (!art) return null;
  const url = new URL(anfrage.url);
  const headers: Record<string, string[]> = {};
  for (const name of GEMELDETE_KOPFZEILEN) {
    const wert = anfrage.headers.get(name);
    if (wert !== null) headers[name] = [wert];
  }
  if (art === "navigation") {
    // Ein Seitenwechsel im Browser ist für die Zählung ein Seitenabruf: Der
    // Zähldienst prüft bei Seiten auf Accept text/html und Sec-Fetch-Dest
    // document, die ein fetch() naturgemäß nicht schickt.
    headers["accept"] = ["text/html"];
    headers["sec-fetch-dest"] = ["document"];
  }
  // Interne Abfrageparameter des Routers gehören nicht zur Adresse.
  url.searchParams.delete("_rsc");
  return {
    ts: jetzt / 1000,
    status: 200,
    request: {
      host: url.hostname.toLowerCase(),
      method: "GET",
      uri: url.pathname + url.search,
      client_ip: clientIp(anfrage.headers),
      headers,
    },
  };
}

/** Meldet einen Eintrag; Fehler und Zeitüberschreitungen werden verschluckt. */
export async function melden(eintrag: Eintrag, ziel: string, token: string): Promise<void> {
  try {
    await fetch(ziel, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ eintraege: [eintrag] }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
  } catch {
    // Die Zählung darf eine Seite nie stören.
  }
}
