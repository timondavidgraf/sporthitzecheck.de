import { describe, expect, it } from "vitest";
import { getDisplayRecommendation, reviewHeadline } from "./recommendations";
import { eventTypeFromIntensity } from "./sportsConfig";

const joined = (points: string[]) => points.join(" | ");

describe("Verbandsaussagen hängen am absoluten WBGT", () => {
  it("behauptet bei verschobenem Rot keine FIFA-Stufe", () => {
    // U16-Breitensport im Pflichtspiel: Rot schon ab 27,6 °C
    const rec = getDisplayRecommendation("football", "red", "match", 28.0);
    const text = joined(rec.stichpunkte) + rec.hauptempfehlung;
    // Keine erreichte Stufe („hoch“/„extrem“) – nur der Hinweis, wo die oberste beginnt
    expect(text).not.toMatch(/FIFA-Stufe „/);
    expect(text).toMatch(/erst über 32 °C/);
    expect(text).toMatch(/FIFPRO empfiehlt ab 28 °C/);
  });

  it("nennt die oberste FIFA-Stufe erst über 32 °C und behauptet keine Pflicht", () => {
    const rec = getDisplayRecommendation("football", "red", "match", 32.5);
    expect(joined(rec.stichpunkte)).toMatch(/FIFA-Stufe „extrem“/);
    expect(joined(rec.stichpunkte)).toMatch(/WM 2026/);
    expect(joined(rec.stichpunkte)).not.toMatch(/Pflicht/);
    expect(joined(rec.stichpunkte)).not.toMatch(/erst über 32 °C/);
    expect(rec.quelle_id).toBe("fifa_2026");
  });

  it("zeigt bei Tennis-Rot unter 30,1 °C weder ITF-Maßnahme noch abgeschwächte Überschrift", () => {
    const rec = getDisplayRecommendation("tennis", "red", "match", 28.0);
    expect(joined(rec.stichpunkte)).not.toMatch(/Extreme Weather Policy aktiv/);
    expect(joined(rec.stichpunkte)).toMatch(/erst ab 30,1 °C/);
    expect(rec.headline).toBe("Spielunterbrechung/-verlegung möglich");
  });

  it("aktiviert die ITF-Stufen an ihren Originalwerten", () => {
    expect(joined(getDisplayRecommendation("tennis", "orange", "match", 30.1).stichpunkte)).toMatch(
      /Extreme Weather Policy aktiv/
    );
    expect(joined(getDisplayRecommendation("tennis", "red", "match", 32.2).stichpunkte)).toMatch(
      /Spielunterbrechung \(32,2 °C/
    );
  });

  it("nennt die UCI-Stufe passend zum absoluten Wert", () => {
    const rec = getDisplayRecommendation("cycling", "red", "training", 26.0);
    expect(joined(rec.stichpunkte)).toMatch(/UCI-Stufe Orange/);
    expect(joined(rec.stichpunkte)).toMatch(/UCI-Rotstufe beginnt erst bei 28 °C/);
  });
});

describe("Überschriften", () => {
  it("formuliert intensives Training / Freundschaftsspiel neutral", () => {
    expect(eventTypeFromIntensity("football", "normal")).toBe("mixed");
    expect(getDisplayRecommendation("football", "orange", "mixed", 29).headline).toBe(
      "Einheit deutlich anpassen"
    );
  });

  it("zeigt den Entscheidungshinweis nur bei Rot im Spiel", () => {
    expect(getDisplayRecommendation("football", "red", "match", 33).officialDecisionNote).toBeDefined();
    expect(getDisplayRecommendation("football", "red", "mixed", 33).officialDecisionNote).toBeUndefined();
  });

  it("lässt nachts den Sonnenschutz weg", () => {
    const rec = getDisplayRecommendation("jogging", "green", "training", 18, false);
    expect(joined(rec.stichpunkte)).not.toMatch(/Sonnenschutz/);
  });
});

describe("Rückblick", () => {
  it("formuliert vergangene Einheiten als Einordnung, nicht als Anweisung", () => {
    expect(reviewHeadline("green", "training", "football")).toBe(
      "Training war aus Hitzesicht unkritisch"
    );
    expect(reviewHeadline("red", "match", "football")).toBe(
      "Spiel: Absage oder Verlegung wäre empfohlen gewesen"
    );
    expect(reviewHeadline("orange", "match", "jogging")).toMatch(/^Wettkampf: deutliche/);
    expect(reviewHeadline("yellow", "mixed", "tennis")).toMatch(/^Einheit: Anpassungen/);
  });
});
