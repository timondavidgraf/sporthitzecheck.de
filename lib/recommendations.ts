/**
 * Handlungsempfehlungen je Sportart und Ampelstufe.
 *
 * Zwei Ebenen, bewusst getrennt:
 * - Die Ampelfarbe ist um Alter, Leistung und Intensität verschoben. Die Texte
 *   zur Farbe beschreiben deshalb nur, was für DIESE Gruppe zu tun ist, und
 *   behaupten keinen Verbandsgrenzwert.
 * - Verbandsaussagen („FIFA-Pflicht ab 32 °C“) hängen am absoluten WBGT und
 *   erscheinen nur, wenn der Verbandswert tatsächlich erreicht ist.
 */

import type { Sport } from "./sportsConfig";
import { intensityFamily } from "./sportsConfig";
import type { SourceId } from "./sourcesRegistry";
import type { ColorCode, EventType } from "./wbgtCalculator";

interface StageRecommendation {
  hauptempfehlung: string;
  stichpunkte: string[];
  quelle_id: SourceId;
}

interface DisplayRecommendation {
  headline: string;
  hauptempfehlung: string;
  stichpunkte: string[];
  quelle_id: SourceId;
  /** Nur Rot + Spiel/Wettkampf: Einordnung, keine Anweisung. */
  officialDecisionNote?: string;
}

/** Verbandsstufe, die ab einem absoluten WBGT-Wert gilt. */
interface OfficialTrigger {
  /** Ab diesem WBGT (°C, einschließlich) ist die Stufe erreicht. */
  from: number;
  text: string;
}

interface OfficialRules {
  sourceId: SourceId;
  /** Aufsteigend sortiert; angezeigt wird nur die höchste erreichte Stufe. */
  triggers: OfficialTrigger[];
}

interface SportRules {
  stages: Record<ColorCode, StageRecommendation>;
  /** Mehrere Organisationen möglich (FIFA und FIFPRO) – je eine Zeile. */
  official?: OfficialRules[];
  /**
   * Hinweis, wenn die Ampel für die Gruppe schon Rot zeigt, der Verbandswert
   * aber noch nicht erreicht ist – sonst wirkt das Rot wie ein Rechenfehler.
   */
  belowOfficialRed?: { from: number; text: string };
}

const SUN_PROTECTION_TIPS = new Set([
  "Sonnenschutz bei wolkenlosem Himmel",
  "Standard-Sonnenschutz",
]);

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
    "Kühlpausen alle 15–20 Minuten im Schatten",
    "Intensität stark reduzieren",
    "Bei empfindlichen Gruppen auf kühlere Tageszeit verlegen",
  ],
  quelle_id: "acsm_general",
};

const ACSM_RED: StageRecommendation = {
  hauptempfehlung: "Abbruch oder Verlegung empfohlen.",
  stichpunkte: [
    "Keine hochintensive Belastung in der Hitze",
    "In kühlere Stunden verlegen oder absagen",
    "Bei Symptomen (Schwindel, Übelkeit) sofort kühlen, Rettungsdienst",
  ],
  quelle_id: "acsm_general",
};

const ACSM_STAGES: Record<ColorCode, StageRecommendation> = {
  green: ACSM_GREEN,
  yellow: ACSM_YELLOW,
  orange: ACSM_ORANGE,
  red: ACSM_RED,
};

const FOOTBALL_STAGES: Record<ColorCode, StageRecommendation> = {
  green: ACSM_GREEN,
  yellow: ACSM_YELLOW,
  orange: {
    hauptempfehlung: "Hohes Hitzerisiko für diese Gruppe – Belastung drosseln, Cooling Breaks einplanen.",
    stichpunkte: [
      "Cooling Break in jeder Halbzeit einplanen",
      "Schatten und Kühlmöglichkeiten am Spielfeldrand bereitstellen",
      "Bei empfindlichen Gruppen (Kinder, ältere Personen) auf kühlere Tageszeit verlegen",
    ],
    quelle_id: "fifpro",
  },
  red: {
    hauptempfehlung: "Sehr hohes Hitzerisiko für diese Gruppe – verlegen oder absagen empfohlen.",
    stichpunkte: [
      "In kühlere Stunden verlegen oder absagen",
      "Findet die Einheit statt: Cooling Breaks in beiden Halbzeiten (etwa Minute 30 und 75)",
      "Bei Symptomen (Schwindel, Übelkeit) sofort kühlen, Rettungsdienst",
    ],
    quelle_id: "fifpro",
  },
};

const CYCLING_STAGES: Record<ColorCode, StageRecommendation> = {
  green: {
    hauptempfehlung: "Keine besonderen Maßnahmen.",
    stichpunkte: ["Normale Hydration", "Reguläres Aufwärmen", "Standard-Sonnenschutz"],
    quelle_id: "uci_2023",
  },
  yellow: {
    hauptempfehlung: "Erste Vorsichtsmaßnahmen treffen.",
    stichpunkte: [
      "Eiswesten oder Kühlung beim Aufwärmen",
      "Zusätzliche Versorgung mit Wasser und Eis unterwegs",
      "Mehr Trinkpunkte einplanen",
    ],
    quelle_id: "uci_2023",
  },
  orange: {
    hauptempfehlung: "Deutliche Hitzeanpassungen nötig.",
    stichpunkte: [
      "Start in schattige Bereiche und auf eine kühlere Tageszeit verlegen",
      "Strecke kürzen oder Intensität senken",
      "Fahrtwind entlastet bei konstanter Fahrt, Gefahr steigt aber bei langsamer Bergauffahrt deutlich",
    ],
    quelle_id: "uci_2023",
  },
  red: {
    hauptempfehlung: "Absagen oder verlegen empfohlen.",
    stichpunkte: [
      "Streckenabschnitte verlegen, kürzen oder absagen",
      "Keine Wettkampfbelastung ohne diese Anpassungen",
      "Sofortige Kühlung bei Symptomen",
    ],
    quelle_id: "uci_2023",
  },
};

const BEACH_HINT =
  "Hinweis: Die FIVB misst den WBGT verpflichtend, nennt aber bewusst keinen Grenzwert – die Daten dahinter stammen von akklimatisierten Profis, deshalb bleibt dieser Fallback konservativ";
const HOCKEY_HINT =
  "Hinweis: Die FIH misst Lufttemperatur und Luftfeuchte (Grenze 35 °C, tiefer ab 65 % Feuchte), nicht WBGT – dieser Wert ist eine Näherung";
const ATHLETICS_HINT =
  "Hinweis: World Athletics nennt Warnstufen, aber keine operativen Cooling-Break-Regeln wie FIFA – die Maßnahmen hier sind ACSM-Näherung";

function withHint(
  stages: Record<ColorCode, StageRecommendation>,
  quelle_id: SourceId,
  hint: string | null
): Record<ColorCode, StageRecommendation> {
  const add = (color: ColorCode): StageRecommendation => {
    const rec = stages[color];
    const stichpunkte =
      hint && color !== "green" ? [...rec.stichpunkte, hint] : rec.stichpunkte;
    return { ...rec, stichpunkte, quelle_id };
  };
  return { green: add("green"), yellow: add("yellow"), orange: add("orange"), red: add("red") };
}

const BELOW_OFFICIAL_SUFFIX = "– die Ampel schaltet für diese Gruppe bewusst früher auf Rot";

const RULES: Record<Sport, SportRules> = {
  football: {
    stages: FOOTBALL_STAGES,
    official: [
      {
        sourceId: "fifa_2026",
        triggers: [
          { from: 30, text: "FIFA-Stufe „hoch“ (30–32 °C WBGT) erreicht" },
          {
            from: 32.1,
            text: "FIFA-Stufe „extrem“ (über 32 °C WBGT): Cooling Breaks in beiden Halbzeiten sind im Spielbetrieb Pflicht",
          },
        ],
      },
      {
        sourceId: "fifpro",
        triggers: [
          { from: 26, text: "FIFPRO empfiehlt ab 26 °C WBGT Cooling Breaks" },
          { from: 28, text: "FIFPRO empfiehlt ab 28 °C WBGT die Verlegung" },
        ],
      },
    ],
    belowOfficialRed: {
      from: 32.1,
      text: `Die FIFA-Pflicht für Cooling Breaks gilt erst über 32 °C WBGT ${BELOW_OFFICIAL_SUFFIX}`,
    },
  },
  tennis: {
    stages: ACSM_STAGES,
    official: [
      {
        sourceId: "itf_heat_policy",
        triggers: [
          {
            from: 30.1,
            text: "ITF Extreme Weather Policy aktiv (ab 30,1 °C WBGT): zusätzliche 10-Minuten-Pause zwischen 2. und 3. Satz",
          },
          {
            from: 32.2,
            text: "ITF-Richtwert für Spielunterbrechung (32,2 °C WBGT) erreicht – bei Turnieren entscheidet der Referee",
          },
        ],
      },
    ],
    belowOfficialRed: {
      from: 30.1,
      text: `Die ITF-Maßnahmen greifen erst ab 30,1 °C WBGT ${BELOW_OFFICIAL_SUFFIX}`,
    },
  },
  cycling: {
    stages: CYCLING_STAGES,
    official: [
      {
        sourceId: "uci_2023",
        triggers: [
          { from: 18, text: "UCI-Stufe Gelb (18–22,9 °C WBGT) erreicht" },
          { from: 23, text: "UCI-Stufe Orange (23–27,9 °C WBGT) erreicht" },
          { from: 28, text: "UCI-Stufe Rot (ab 28 °C WBGT) erreicht" },
        ],
      },
    ],
    belowOfficialRed: {
      from: 28,
      text: `Die UCI-Rotstufe beginnt erst bei 28 °C WBGT ${BELOW_OFFICIAL_SUFFIX}`,
    },
  },
  athletics: {
    stages: withHint(ACSM_STAGES, "acsm_general", ATHLETICS_HINT),
    official: [
      {
        sourceId: "world_athletics",
        triggers: [
          { from: 21, text: "World Athletics: Stufe „Vorsicht“ (21–25 °C WBGT)" },
          { from: 25, text: "World Athletics: Stufe „Warnung“ (25–28 °C WBGT)" },
          { from: 28, text: "World Athletics: Stufe „starke Warnung“ (28–30 °C WBGT)" },
          { from: 30.1, text: "World Athletics: Stufe „gefährlich“ (über 30 °C WBGT)" },
        ],
      },
    ],
    belowOfficialRed: {
      from: 28,
      text: `Die Rotstufe nach World Athletics beginnt erst bei 28 °C WBGT ${BELOW_OFFICIAL_SUFFIX}`,
    },
  },
  beachvolleyball: {
    stages: withHint(ACSM_STAGES, "acsm_fallback_beachvolleyball", BEACH_HINT),
  },
  fieldhockey: {
    stages: withHint(ACSM_STAGES, "fih_air_temp", HOCKEY_HINT),
  },
  jogging: {
    stages: ACSM_STAGES,
  },
};

/** Höchste erreichte Verbandsstufe je Organisation, als Stichpunkt. */
function reachedOfficial(
  rules: SportRules,
  wbgt: number
): { points: string[]; sourceId?: SourceId } {
  const points: string[] = [];
  let sourceId: SourceId | undefined;

  for (const org of rules.official ?? []) {
    const reached = org.triggers.filter((t) => wbgt >= t.from).pop();
    if (!reached) continue;
    points.push(reached.text);
    sourceId ??= org.sourceId;
  }

  return { points, sourceId };
}

function recommendationHeadline(color: ColorCode, eventType: EventType, sport: Sport): string {
  const endurance = intensityFamily(sport) === "endurance";
  const competition = eventType === "match";
  const activity =
    eventType === "mixed"
      ? "Einheit"
      : competition
        ? endurance
          ? "Wettkampf"
          : "Spiel"
        : "Training";

  switch (color) {
    case "green":
      return `${activity} möglich`;
    case "yellow":
      return competition
        ? `${activity} mit erhöhter Aufmerksamkeit`
        : `${activity} mit Anpassungen`;
    case "orange":
      return competition ? `${activity} mit Cooling Breaks` : `${activity} deutlich anpassen`;
    case "red":
      return competition
        ? endurance
          ? "Wettkampfabsage/-verlegung möglich"
          : "Spielunterbrechung/-verlegung möglich"
        : `${activity} absagen oder verlegen empfohlen`;
  }
}

const OFFICIAL_DECISION_NOTE =
  "Entscheidung liegt bei Schiedsrichter/Ausrichter, nicht bei uns";

export function getDisplayRecommendation(
  sport: Sport,
  colorCode: ColorCode,
  eventType: EventType,
  wbgtValue: number,
  isDaytime = true
): DisplayRecommendation {
  const rules = RULES[sport];
  const stage = rules.stages[colorCode];
  const official = reachedOfficial(rules, wbgtValue);

  const belowOfficial =
    colorCode === "red" && rules.belowOfficialRed && wbgtValue < rules.belowOfficialRed.from
      ? [rules.belowOfficialRed.text]
      : [];

  const stagePoints = isDaytime
    ? stage.stichpunkte
    : stage.stichpunkte.filter((point) => !SUN_PROTECTION_TIPS.has(point));

  return {
    headline: recommendationHeadline(colorCode, eventType, sport),
    hauptempfehlung: stage.hauptempfehlung,
    stichpunkte: [...official.points, ...stagePoints, ...belowOfficial],
    quelle_id: official.sourceId ?? stage.quelle_id,
    officialDecisionNote:
      colorCode === "red" && eventType === "match" ? OFFICIAL_DECISION_NOTE : undefined,
  };
}
