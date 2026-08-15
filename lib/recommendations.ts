/**
 * Handlungsempfehlungen je Sportart und Ampelstufe.
 * Verbandsmaßnahmen stehen wörtlich; wo es keine gibt, ACSM-Sprache mit Quelle.
 */

import type { Sport } from "./sportsConfig";
import { SPORTS } from "./sportsConfig";
import type { SourceId } from "./sourcesRegistry";
import { sourcesRegistry } from "./sourcesRegistry";
import type { ColorCode, EventType } from "./wbgtCalculator";

export interface StageRecommendation {
  hauptempfehlung: string;
  stichpunkte: string[];
  quelle_id: SourceId;
}

export interface DisplayRecommendation {
  headline: string;
  hauptempfehlung: string;
  stichpunkte: string[];
  quelle_id: SourceId;
  /** Nur Rot + Spiel/Wettkampf: Einordnung, keine Anweisung. */
  officialDecisionNote?: string;
}

const ACSM_GREEN: StageRecommendation = {
  hauptempfehlung: "Kein besonderes Risiko, regulärer Betrieb sicher.",
  stichpunkte: [
    "Normale Trinkpausen nach Bedarf",
    "Reguläre Aufwärmphase",
    "Sonnenschutz bei wolkenlosem Himmel",
  ],
  quelle_id: "acsm_general",
};

const ACSM_YELLOW: StageRecommendation = {
  hauptempfehlung: "Erhöhte Aufmerksamkeit, Trinkpausen forcieren.",
  stichpunkte: [
    "Trinkpausen alle 20-30 Minuten aktiv einfordern",
    "Intensität bei Ausdauerläufen/Sprints leicht reduzieren",
    "Athleten auf erste Erschöpfungszeichen beobachten",
  ],
  quelle_id: "acsm_general",
};

const ACSM_ORANGE: StageRecommendation = {
  hauptempfehlung: "Belastung deutlich drosseln, Kühlpausen im Schatten.",
  stichpunkte: [
    "Kühlpausen alle 15–20 Minuten im Schatten (ACSM)",
    "Intensität stark reduzieren",
    "Bei empfindlichen Gruppen auf kühlere Tageszeit verlegen",
  ],
  quelle_id: "acsm_general",
};

const ACSM_RED: StageRecommendation = {
  hauptempfehlung: "Abbruch oder Verlegung empfohlen.",
  stichpunkte: [
    "Keine hochintensive Belastung in der Hitze (ACSM)",
    "In kühlere Stunden verlegen oder absagen",
    "Bei Symptomen (Schwindel, Übelkeit) sofort kühlen, Rettungsdienst",
  ],
  quelle_id: "acsm_general",
};

const FOOTBALL: Record<ColorCode, StageRecommendation> = {
  green: ACSM_GREEN,
  yellow: ACSM_YELLOW,
  orange: {
    hauptempfehlung: "FIFA sieht ab hier freiwillige Cooling Breaks vor.",
    stichpunkte: [
      "Freiwillige Trinkpause (FIFA: möglich zwischen 27-32°C WBGT)",
      "Schatten/Kühlmöglichkeiten am Spielfeldrand bereitstellen",
      "Bei empfindlichen Gruppen (Kinder, ältere Personen) auf kühlere Tageszeit verlegen",
    ],
    quelle_id: "fifa_2026",
  },
  red: {
    hauptempfehlung:
      "FIFA-Schwelle für verpflichtende Cooling Breaks erreicht (≥32°C WBGT).",
    stichpunkte: [
      "Verpflichtende Cooling Break lt. FIFA: 2x 3 Minuten (Minute 30 und 75)",
      "FIFPRO empfiehlt bereits ab 28°C Spielverlegung zu prüfen (siehe Alternativquelle)",
      "Bei Symptomen (Schwindel, Übelkeit) sofort kühlen, Rettungsdienst",
    ],
    quelle_id: "fifa_2026",
  },
};

const CYCLING: Record<ColorCode, StageRecommendation> = {
  green: {
    hauptempfehlung: "Keine besonderen Maßnahmen.",
    stichpunkte: [
      "Normale Hydration",
      "Reguläres Aufwärmen",
      "Standard-Sonnenschutz",
    ],
    quelle_id: "uci_2023",
  },
  yellow: {
    hauptempfehlung: "UCI empfiehlt erste Vorsichtsmaßnahmen.",
    stichpunkte: [
      "Eiswesten beim Aufwärmen (UCI-Empfehlung)",
      "Zusätzliche Versorgungsfahrzeuge mit Wasser/Eis",
      "Hydrationszonen erhöhen",
    ],
    quelle_id: "uci_2023",
  },
  orange: {
    hauptempfehlung: "UCI High Temperature Protocol aktiv.",
    stichpunkte: [
      "Startzonen in schattige Bereiche verlegen (UCI)",
      "Startzeiten ggf. vorverlegen",
      "Fahrtwind entlastet bei konstanter Fahrt, Gefahr steigt aber bei langsamer Bergauffahrt deutlich",
    ],
    quelle_id: "uci_2023",
  },
  red: {
    hauptempfehlung: "UCI-Hochrisikoschwelle erreicht.",
    stichpunkte: [
      "Streckenabschnitte verlegen oder absagen (UCI-Empfehlung)",
      "Keine Wettkampfbelastung ohne diese Anpassungen",
      "Sofortige Kühlung bei Symptomen",
    ],
    quelle_id: "uci_2023",
  },
};

const ITF_ORANGE: StageRecommendation = {
  hauptempfehlung: "ITF Modification of Play greift.",
  stichpunkte: [
    "Zusätzliche 10-Minuten-Pause zwischen 2. und 3. Satz (ITF-Regel)",
    "Schattenplätze/Kühlwesten in den Pausen nutzen",
    "Auf Symptome bei Kindern und älteren Personen besonders achten",
  ],
  quelle_id: "itf_heat_policy",
};

const ITF_RED: StageRecommendation = {
  hauptempfehlung: "ITF-Richtwert für Spielunterbrechung erreicht.",
  stichpunkte: [
    "ITF-Suspension-Richtwert 32,2°C erreicht - Unterbrechung prüfen",
    "Bei Turnieren liegt Entscheidung beim Referee, nicht bei dieser App",
    "Sofortige Kühlung bei Symptomen, kein Weiterspielen erzwingen",
  ],
  quelle_id: "itf_heat_policy",
};

const BEACH_HINT =
  "Hinweis: FIVB selbst nennt keinen Grenzwert - Profidaten deuten auf höhere Toleranz hin als hier angenommen";
const HOCKEY_HINT =
  "Hinweis: FIH misst offiziell Lufttemperatur (Grenze 35°C), nicht WBGT - dieser Wert ist eine Näherung";
const ATHLETICS_HINT =
  "Hinweis: World Athletics nennt Warnstufen (25/28/30 °C), keine operativen Cooling-Break-Regeln wie FIFA – Maßnahmen hier ACSM-Näherung";

function withHint(
  rec: StageRecommendation,
  quelle_id: SourceId,
  hint: string | null,
  color: ColorCode
): StageRecommendation {
  const stichpunkte =
    hint && color !== "green" ? [...rec.stichpunkte, hint] : rec.stichpunkte;
  return { ...rec, stichpunkte, quelle_id };
}

function acsmFallback(
  quelle_id: SourceId,
  hint: string | null
): Record<ColorCode, StageRecommendation> {
  return {
    green: withHint(ACSM_GREEN, quelle_id, hint, "green"),
    yellow: withHint(ACSM_YELLOW, quelle_id, hint, "yellow"),
    orange: withHint(ACSM_ORANGE, quelle_id, hint, "orange"),
    red: withHint(ACSM_RED, quelle_id, hint, "red"),
  };
}

function tennisStage(color: ColorCode, wbgt: number): StageRecommendation {
  const extraPauseAt = SPORTS.tennis.thresholds.extraPauseAt ?? 30.1;
  const suspensionAt = SPORTS.tennis.thresholds.suspensionAt ?? 32.2;
  if (wbgt >= suspensionAt) return ITF_RED;
  if (wbgt >= extraPauseAt || color === "red") return ITF_ORANGE;
  if (color === "orange") return ACSM_YELLOW;
  if (color === "yellow") return ACSM_YELLOW;
  return ACSM_GREEN;
}

function stageFor(
  sport: Sport,
  color: ColorCode,
  wbgt: number
): StageRecommendation {
  switch (sport) {
    case "football":
      return FOOTBALL[color];
    case "cycling":
      return CYCLING[color];
    case "tennis":
      return tennisStage(color, wbgt);
    case "beachvolleyball":
      return acsmFallback("acsm_fallback_beachvolleyball", BEACH_HINT)[color];
    case "fieldhockey":
      return acsmFallback("fih_air_temp", HOCKEY_HINT)[color];
    case "jogging":
      return acsmFallback("acsm_general", null)[color];
    case "athletics":
      return acsmFallback("acsm_general", ATHLETICS_HINT)[color];
  }
}

export function isCompetitionEvent(eventType: EventType): boolean {
  return eventType === "match" || eventType === "tournament";
}

export function recommendationHeadline(
  color: ColorCode,
  eventType: EventType
): string {
  const match = isCompetitionEvent(eventType);
  switch (color) {
    case "green":
      return match ? "Spiel möglich" : "Training möglich";
    case "yellow":
      return match ? "Spiel mit erhöhter Aufmerksamkeit" : "Training mit Anpassungen";
    case "orange":
      return match ? "Spiel mit Cooling Breaks" : "Training deutlich anpassen";
    case "red":
      return match
        ? "Spielunterbrechung/-verlegung möglich"
        : "Training absagen empfohlen";
  }
}

const OFFICIAL_DECISION_NOTE =
  "Entscheidung liegt bei Schiedsrichter/Ausrichter, nicht bei uns";

export function getDisplayRecommendation(
  sport: Sport,
  colorCode: ColorCode,
  eventType: EventType,
  wbgtValue: number
): DisplayRecommendation {
  const stage = stageFor(sport, colorCode, wbgtValue);
  const match = isCompetitionEvent(eventType);
  const headlineColor =
    sport === "tennis" ? tennisHeadlineColor(colorCode, wbgtValue) : colorCode;
  return {
    headline: recommendationHeadline(headlineColor, eventType),
    hauptempfehlung: stage.hauptempfehlung,
    stichpunkte: stage.stichpunkte,
    quelle_id: stage.quelle_id,
    officialDecisionNote:
      headlineColor === "red" && match ? OFFICIAL_DECISION_NOTE : undefined,
  };
}

function tennisHeadlineColor(color: ColorCode, wbgt: number): ColorCode {
  const extraPauseAt = SPORTS.tennis.thresholds.extraPauseAt ?? 30.1;
  const suspensionAt = SPORTS.tennis.thresholds.suspensionAt ?? 32.2;
  if (wbgt >= suspensionAt) return "red";
  if (wbgt >= extraPauseAt) return "orange";
  return color === "red" ? "orange" : color;
}

export function sourceName(id: SourceId): string {
  return sourcesRegistry[id].name;
}
