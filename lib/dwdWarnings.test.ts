import { describe, expect, it } from "vitest";
import { heatWarningFrom, type DwdAlert } from "./dwdWarnings";
import { peakUvIndex, uvAdvice, uvCategory } from "./uvIndex";

const start = new Date("2026-07-10T17:00:00+02:00");
const end = new Date("2026-07-10T19:00:00+02:00");

const strong: DwdAlert = {
  event_code: 247,
  event_de: "STARKE HITZE",
  onset: "2026-07-10T11:00:00+02:00",
  expires: "2026-07-10T19:00:00+02:00",
};

describe("DWD-Hitzewarnung", () => {
  it("meldet Stufe 1, wenn die Warnung die Einheit überschneidet", () => {
    expect(heatWarningFrom([strong], start, end)?.level).toBe(1);
  });

  it("nimmt die höhere Stufe, wenn beide gelten", () => {
    const extreme: DwdAlert = { ...strong, event_code: 248, event_de: "EXTREME HITZE" };
    expect(heatWarningFrom([strong, extreme], start, end)?.level).toBe(2);
  });

  it("erkennt Hitze auch ohne Ereigniscode am Namen", () => {
    expect(heatWarningFrom([{ ...strong, event_code: null }], start, end)?.level).toBe(1);
  });

  it("ignoriert andere Warnungen und Warnungen außerhalb des Zeitraums", () => {
    const rain: DwdAlert = { ...strong, event_code: 64, event_de: "ERGIEBIGER DAUERREGEN" };
    const yesterday: DwdAlert = {
      ...strong,
      onset: "2026-07-09T11:00:00+02:00",
      expires: "2026-07-09T19:00:00+02:00",
    };
    // Endet genau zum Beginn der Einheit: keine Überschneidung
    const endsAtStart: DwdAlert = { ...strong, expires: "2026-07-10T17:00:00+02:00" };
    expect(heatWarningFrom([rain, yesterday, endsAtStart], start, end)).toBeNull();
  });

  it("zeigt lieber nichts als eine Warnung ohne lesbaren Beginn", () => {
    expect(heatWarningFrom([{ ...strong, onset: null }], start, end)).toBeNull();
    expect(heatWarningFrom([{ ...strong, onset: "unsinn" }], start, end)).toBeNull();
  });
});

describe("UV-Index", () => {
  it("ordnet nach der WHO-Skala ein", () => {
    expect(uvCategory(2.4)).toBe("niedrig");
    expect(uvCategory(2.6)).toBe("mäßig");
    expect(uvCategory(5.4)).toBe("mäßig");
    expect(uvCategory(7)).toBe("hoch");
    expect(uvCategory(8)).toBe("sehr hoch");
    expect(uvCategory(11)).toBe("extrem");
  });

  it("empfiehlt Sonnenschutz ab 3 und verschärft ab 8", () => {
    expect(uvAdvice(2)).toBeNull();
    expect(uvAdvice(3)).toMatch(/Sonnenschutz nötig/);
    expect(uvAdvice(8)).toMatch(/Mittagssonne meiden/);
  });

  it("nimmt den höchsten Wert und kommt mit Lücken zurecht", () => {
    expect(peakUvIndex([{ uvIndex: 3.2 }, { uvIndex: null }, { uvIndex: 6.1 }])).toBe(6.1);
    expect(peakUvIndex([{ uvIndex: null }])).toBeNull();
  });
});
