import { describe, expect, it } from "vitest";
import { eintragAus, GEMELDETE_KOPFZEILEN, seitenArt } from "./besucherzaehlung";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function anfrage(url: string, kopf: Record<string, string>, method = "GET") {
  return { method, url, headers: new Headers(kopf) };
}

describe("seitenArt", () => {
  it("erkennt ganze Seiten", () => {
    expect(seitenArt(anfrage("https://sporthitzecheck.de/", { "sec-fetch-dest": "document" }))).toBe("dokument");
  });

  it("erkennt Seitenwechsel über den Router", () => {
    const a = anfrage("https://sporthitzecheck.de/prognose", {
      "sec-fetch-dest": "empty",
      accept: "text/x-component",
    });
    expect(seitenArt(a)).toBe("navigation");
  });

  it("zählt keine sonstigen fetch()-Aufrufe, Bilder oder POSTs", () => {
    expect(seitenArt(anfrage("https://sporthitzecheck.de/x", { "sec-fetch-dest": "empty", accept: "*/*" }))).toBeNull();
    expect(seitenArt(anfrage("https://sporthitzecheck.de/x", { "sec-fetch-dest": "image" }))).toBeNull();
    expect(seitenArt(anfrage("https://sporthitzecheck.de/", { "sec-fetch-dest": "document" }, "POST"))).toBeNull();
  });
});

describe("eintragAus", () => {
  it("meldet nur die nötigen Kopfzeilen und die IP aus x-real-ip", () => {
    const e = eintragAus(
      anfrage("https://sporthitzecheck.de/prognose?utm_source=verband&_rsc=abc", {
        "sec-fetch-dest": "document",
        "user-agent": CHROME,
        accept: "text/html",
        "accept-language": "de-DE",
        cookie: "geheim=1",
        authorization: "Bearer x",
        "x-real-ip": "203.0.113.7",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
      }),
      1_793_091_600_000,
    );
    expect(e).not.toBeNull();
    expect(e!.ts).toBe(1_793_091_600);
    expect(e!.request.client_ip).toBe("203.0.113.7");
    expect(e!.request.uri).toBe("/prognose?utm_source=verband");
    expect(e!.request.host).toBe("sporthitzecheck.de");
    expect(Object.keys(e!.request.headers).every((k) => (GEMELDETE_KOPFZEILEN as readonly string[]).includes(k))).toBe(true);
    expect(e!.request.headers).not.toHaveProperty("cookie");
  });

  it("schreibt einen Seitenwechsel als Seitenabruf", () => {
    const e = eintragAus(
      anfrage("https://sporthitzecheck.de/prognose", {
        "sec-fetch-dest": "empty",
        accept: "text/x-component",
        "x-forwarded-for": "198.51.100.1, 10.0.0.1",
      }),
    );
    expect(e!.request.headers["accept"]).toEqual(["text/html"]);
    expect(e!.request.headers["sec-fetch-dest"]).toEqual(["document"]);
    expect(e!.request.client_ip).toBe("198.51.100.1");
  });

  it("gibt Widerspruchssignale weiter, damit der Zähldienst sie beachtet", () => {
    const e = eintragAus(anfrage("https://sporthitzecheck.de/", { "sec-fetch-dest": "document", "sec-gpc": "1" }));
    expect(e!.request.headers["sec-gpc"]).toEqual(["1"]);
  });
});
