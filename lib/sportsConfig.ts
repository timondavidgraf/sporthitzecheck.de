/**
 * Sportarten, Untergründe und Ampel-Schwellen an einer Stelle.
 *
 * Schwellen stammen aus `sourcesRegistry`. Wo ein Verband keine 4 Stufen
 * definiert, steht das im Kommentar und in der Quelle – Zwischenstufen
 * sind dann UI-Interpolation, keine offizielle Verbandszahl.
 */

import type { AgeBand, ColorCode, PerformanceLevel, Surface } from "./wbgtCalculator";
import {
  sourcesRegistry,
  type SourceConfidence,
  type SourceId,
} from "./sourcesRegistry";

export type Sport =
  | "football"
  | "tennis"
  | "beachvolleyball"
  | "cycling"
  | "athletics"
  | "jogging"
  | "fieldhockey";

export interface AmpelBounds {
  gruen_max: number;
  gelb_max: number;
  orange_max: number;
}

export interface AlternativeThresholds {
  sourceId: SourceId;
  cooling_break_ab: number;
  verlegung_empfohlen_ab: number;
}

export interface SportThresholds {
  /** Elite-/Verbandsschwelle. null = es gibt keine, nur Fallback. */
  profi: AmpelBounds | null;
  fallback: AmpelBounds | null;
  sourceId: SourceId;
  extraPauseAt?: number;
  suspensionAt?: number;
  alternative?: AlternativeThresholds;
  /** UI-Hinweis, wenn Stufen interpoliert sind – kein Verbandszwischenwert. */
  interpolationNote?: string;
  /** Zusatzttext in der Ampelzeile, z. B. originale UCI-Stufe. */
  stageNotes?: Partial<Record<ColorCode, string>>;
}

export interface SurfaceMeta {
  label: string;
  short?: string;
  swatch: string;
  image?: string;
}

export type SurfaceConfidence =
  | "hoch"
  | "mittel"
  | "niedrig"
  | "nicht_zutreffend"
  | "unbestätigt";

export interface UntergrundConfig {
  name: string;
  /**
   * Zuschlag in °C auf den aus Wetterdaten berechneten WBGT. `null` = kein
   * Zahlen-Offset, nur qualitativer Warnhinweis.
   *
   * Grundlage ist Pryor et al. (2017), wo vor Ort gemessene Werte um 1,0–1,7 °C
   * über den aus Wetterstationsdaten modellierten lagen. Wichtig für die
   * Einordnung: Diese Studie fand KEINE signifikanten Unterschiede zwischen den
   * Sportbelägen selbst – belegt ist „Platz wärmer als Wetterstation“, nicht
   * „Belag X wärmer als Belag Y“. Die Offsets sind daher als Vor-Ort-Zuschlag
   * für stark aufheizende, versiegelte Beläge zu lesen, nicht als validierte
   * Rangfolge. Bewusst vorsichtig nach oben gesetzt.
   */
  wbgtOffset: number | null;
  offsetRange?: [number, number];
  konfidenz: SurfaceConfidence;
  hazardWarning?: string;
  /** Dezenter Hinweis (z. B. Beschattung wählen), kein Hitze-Alarm. */
  hinweis?: string;
  /** Warum bewusst kein Zahlen-Offset gesetzt ist – Dokumentation, nicht UI. */
  kein_offset_grund?: string;
  quelle_id: SourceId;
  status?: "pending_research";
}

export interface SportDefinition {
  id: Sport;
  label: string;
  short?: string;
  surfaces: readonly Surface[];
  untergruende: Partial<Record<Surface, UntergrundConfig>>;
  thresholds: SportThresholds;
  /** Interne Notiz, nicht für die Oberfläche. */
  hinweisIntern?: string;
}

/**
 * Altersabzug von der Verbandsschwelle. Nur wenn `profi` gesetzt ist.
 *
 * Jugend: −1 °C wie in der ursprünglichen Vorgabe – Vorsicht, keine Physiologie.
 * Die Annahme, Kinder seien hitzeempfindlicher, gilt als überholt (Rowland 2008;
 * Falk & Dotan 2008). Der ACSM hält es dennoch für vernünftig, sie als
 * Risikogruppe zu behandeln.
 *
 * 65+: dieselbe −1 °C. Die Richtung ist besser belegt (geringere Schweißrate und
 * Hautdurchblutung ab etwa 60 Jahren; CDC 65+; Meade et al. 2023), der Betrag
 * ist gesetzt, kein Verbandswert.
 */
export const AGE_BAND_OFFSETS: Record<AgeBand, number> = {
  youth: -1.0,
  adult: 0,
  senior: -1.0,
};

/**
 * Leistungsabzug: nur Erwachsene können „Professionell / Akklimatisiert“ wählen.
 * Jugend und 65+ werden auf Breitensport gezwungen.
 *
 * −2 °C für Breitensport ist eine grobe Analogie zum Abstand Elite vs.
 * nicht akklimatisierte Freizeitsportler, kleiner als der frühere Mischwert −3.
 */
export const PERFORMANCE_OFFSETS: Record<PerformanceLevel, number> = {
  recreational: -2.0,
  elite: 0,
};

export const DEFAULT_PERFORMANCE: PerformanceLevel = "recreational";

/**
 * Ampelgrenzen für Sportarten ohne eigenen Verbandswert.
 *
 * Abgeleitet aus Tabelle 2 des ACSM Position Stand (2007), die acht Stufen
 * kennt: bis 18,3 °C unbedenklich, ab 18,4 °C steigt das Risiko für
 * Vorbelastete, ab 22,3 °C für alle, ab 25,7 °C deutlich für Unfitte und
 * Nichtakklimatisierte, ab 27,9 °C liegt die Abbruchempfehlung für
 * Ausdauerwettkämpfe.
 */
export const ACSM_FALLBACK_BOUNDS: AmpelBounds = {
  gruen_max: 18.3,
  gelb_max: 22.2,
  orange_max: 27.8,
};

export const ACSM_FALLBACK_NOTE =
  "Der ACSM Position Stand (2007) staffelt in acht Stufen (Grenzen 18,3 / 22,2 / 25,6 / 27,8 / 30,0 / 32,2 °C). Unsere vierstufige Ampel fasst sie zusammen: Grün bis 18,3 °C, Gelb bis 22,2 °C (Risiko für Vorbelastete steigt), Orange bis 27,8 °C (Risiko für alle, ab 25,7 °C deutlich für Nichtakklimatisierte), Rot ab 27,9 °C – genau dort setzt die ACSM-Abbruchempfehlung für Ausdauerwettkämpfe an.";

export type IntensityLevel = "easy" | "normal" | "intense";

export interface IntensityModifier {
  id: IntensityLevel;
  label: string;
  short: string;
  schwellenOffset: number;
  quelle_id: "acgih_tlv";
}

type IntensityFamily = "match" | "endurance";

const MATCH_SPORTS: ReadonlySet<Sport> = new Set([
  "football",
  "tennis",
  "beachvolleyball",
  "fieldhockey",
]);

export function intensityFamily(sport: Sport): IntensityFamily {
  return MATCH_SPORTS.has(sport) ? "match" : "endurance";
}

/** Bewässerung gilt für Sportplätze, nicht für Straße/Weg beim Joggen oder Radfahren. */
export function sportAllowsWatering(sport: Sport): boolean {
  return sport !== "jogging" && sport !== "cycling";
}

/**
 * Sportartübergreifend, ACGIH-Analogie. Sicherheits-Näherung, nicht für Sport
 * validiert – gilt genauso wie Alters- und Leistungs-Offset, die Kombination
 * erhöht die Sicherheit nicht.
 *
 * Offsets: lockeres Training mehr Pausen → Schwellen höher; Wettkampf/Pflichtspiel
 * weniger Pausen → Schwellen tiefer. Intensives Training und Freundschaftsspiel
 * liegen dazwischen.
 */
export const INTENSITY_LEVELS: readonly IntensityModifier[] = [
  {
    id: "easy",
    label: "Lockeres Training",
    short: "Locker",
    schwellenOffset: 1.5,
    quelle_id: "acgih_tlv",
  },
  {
    id: "normal",
    label: "Intensives Training / Freundschaftsspiel",
    short: "Intensiv",
    schwellenOffset: 0,
    quelle_id: "acgih_tlv",
  },
  {
    id: "intense",
    label: "Wettkampf / Pflichtspiel",
    short: "Wettkampf",
    schwellenOffset: -1.5,
    quelle_id: "acgih_tlv",
  },
];

export const DEFAULT_INTENSITY: IntensityLevel = "normal";

export function intensityModifier(
  level: IntensityLevel,
  _sport?: Sport
): IntensityModifier {
  return INTENSITY_LEVELS.find((item) => item.id === level) ?? INTENSITY_LEVELS[1];
}

export function intensityThresholdOffset(level: IntensityLevel): number {
  return intensityModifier(level).schwellenOffset;
}

/** Anzeigename der Intensität, z. B. „Wettkampf / Pflichtspiel“. */
export function intensityHeadline(level: IntensityLevel, sport?: Sport): string {
  return intensityModifier(level, sport).label;
}

/** Handlungsempfehlung: Training vs. Spiel/Wettkampf, aus der Intensität. */
export function eventTypeFromIntensity(
  sport: Sport,
  level: IntensityLevel
): "training" | "match" | "tournament" {
  if (intensityFamily(sport) === "match") {
    if (level === "easy") return "training";
    return "match";
  }
  return level === "intense" ? "match" : "training";
}

export function durationForIntensity(sport: Sport, level: IntensityLevel): number {
  if (intensityFamily(sport) === "match") {
    return level === "easy" ? 90 : 120;
  }
  return level === "intense" ? 120 : 90;
}

export const SURFACE_CATALOG: Record<Surface, SurfaceMeta> = {
  grass: {
    label: "Naturrasen",
    swatch: "bg-green-500",
    image: "/surfaces/grass.png",
  },
  turf_black: {
    label: "Kunstrasen SBR / schwarz",
    short: "Kunstrasen SBR",
    swatch: "bg-gray-800",
    image: "/surfaces/turf_black.png",
  },
  turf_light: {
    label: "Kunstrasen Kork / Natur-Infill",
    short: "Kunstrasen Kork",
    swatch: "bg-amber-700",
    image: "/surfaces/turf_light.png",
  },
  turf_epdm: {
    label: "Kunstrasen EPDM / grün",
    short: "Kunstrasen EPDM",
    swatch: "bg-green-700",
    image: "/surfaces/turf_light.png",
  },
  sand_clay: {
    label: "Hartplatz / Asche",
    short: "Asche",
    swatch: "bg-red-700",
    image: "/surfaces/sand_clay.png",
  },
  clay_red: {
    label: "Sandplatz (frisch gewässert)",
    short: "Sand nass",
    swatch: "bg-red-600",
    image: "/surfaces/clay_red.png",
  },
  clay_red_dry: {
    label: "Sandplatz (trocken)",
    short: "Sand trocken",
    swatch: "bg-orange-700",
    image: "/surfaces/clay_red.png",
  },
  hardcourt: {
    label: "Hardcourt / Acryl",
    short: "Hardcourt",
    swatch: "bg-blue-600",
    image: "/surfaces/hardcourt.png",
  },
  quartz_sand: {
    label: "Tiefsand",
    swatch: "bg-yellow-200",
    image: "/surfaces/quartz_sand.png",
  },
  asphalt: {
    label: "Asphalt/Straße",
    short: "Asphalt",
    swatch: "bg-slate-500",
    image: "/surfaces/asphalt.png",
  },
  gravel: {
    label: "Waldweg/Schotter",
    short: "Schotter",
    swatch: "bg-stone-400",
    image: "/surfaces/gravel.png",
  },
  tartan: {
    label: "Tartanbahn/Polyurethan",
    short: "Tartan",
    swatch: "bg-red-500",
    image: "/surfaces/tartan.png",
  },
  hockey_water: {
    label: "Vollkunststoffrasen (Wasserplatz)",
    short: "Wasserplatz",
    swatch: "bg-sky-500",
    image: "/surfaces/hockey_water.png",
  },
  turf_sand: {
    label: "Kunstrasen sandverfüllt",
    short: "Kunstrasen Sand",
    swatch: "bg-lime-700",
    image: "/surfaces/turf_black.png",
  },
};

const KUNSTRASEN_WARNING =
  "Kunstrasen wird 50–60 °C heiß: Verbrennungsgefahr bei Hautkontakt, starke Strahlungswärme in Kopfhöhe. Zum WBGT ist die Studienlage widersprüchlich – meist kein Unterschied zu Naturrasen, eine Studie fand +2,2 °C. Daher kein Zahlenzuschlag, aber Vorsicht. Im Schatten geringer.";

function footballTurf(name: string): UntergrundConfig {
  return {
    name,
    wbgtOffset: null,
    konfidenz: "nicht_zutreffend",
    quelle_id: "grundstein_cooper_2020",
    hazardWarning: KUNSTRASEN_WARNING,
  };
}

const TARTAN_CONFIG: UntergrundConfig = {
  name: "Tartanbahn/Polyurethan",
  wbgtOffset: 1.0,
  offsetRange: [0.5, 1.7],
  konfidenz: "mittel",
  quelle_id: "pryor_2017",
  hazardWarning:
    "Tartanbahnen heizen sich stark auf; Vor-Ort-WBGT lag über Wetterstationswerten.",
};

function asphaltConfig(includeFahrtwind: boolean): UntergrundConfig {
  return {
    name: "Asphalt/Straße",
    wbgtOffset: null,
    konfidenz: "nicht_zutreffend",
    quelle_id: "pending",
    hazardWarning: includeFahrtwind
      ? "Asphalt speichert und strahlt Wärme stark – keine belastbare WBGT-Zahl für den Sport, daher nur Hinweis. Fahrtwind kühlt bei Tempo, kaum bei langsamer Bergauffahrt."
      : "Asphalt speichert und strahlt Wärme stark – keine belastbare WBGT-Zahl für den Sport, daher nur Hinweis.",
  };
}

const GRAVEL_CONFIG: UntergrundConfig = {
  name: "Waldweg/Schotter",
  wbgtOffset: 0,
  konfidenz: "mittel",
  quelle_id: "john_2024_canopy",
  kein_offset_grund:
    "Der Kühleffekt von Waldschatten (bis zu 3–4 °C geringere Lufttemperatur unter Kronendach gegenüber Freifläche laut Studie) wird bereits über das separate Beschattung-Feld erfasst. Ein zusätzlicher Untergrund-Offset würde denselben Effekt doppelt zählen.",
  hinweis: "Oft natürlicher Schatten – Beschattung hier setzen, kein Extra-Zuschlag.",
};

function pendingNatural(name: string): UntergrundConfig {
  return {
    name,
    wbgtOffset: 0,
    konfidenz: "niedrig",
    quelle_id: "pending",
    status: "pending_research",
  };
}

export const SPORTS: Record<Sport, SportDefinition> = {
  football: {
    id: "football",
    label: "Fußball",
    surfaces: ["grass", "turf_black", "turf_epdm", "turf_sand", "turf_light", "sand_clay"],
    untergruende: {
      grass: {
        name: "Naturrasen",
        wbgtOffset: 0,
        konfidenz: "hoch",
        quelle_id: "grundstein_cooper_2020",
      },
      turf_black: footballTurf("Kunstrasen SBR / schwarz"),
      turf_epdm: footballTurf("Kunstrasen EPDM / grün"),
      turf_sand: footballTurf("Kunstrasen sandverfüllt"),
      turf_light: footballTurf("Kunstrasen Kork / Natur-Infill"),
      sand_clay: {
        name: "Hartplatz / Asche",
        wbgtOffset: null,
        konfidenz: "niedrig",
        quelle_id: "grundstein_cooper_2020",
        hazardWarning:
          "Ähnlich Kunstrasen erwartet, aber keine Belag-Studie – Einschätzung durch Analogie.",
      },
    },
    thresholds: {
      // FIFA-Risikokategorien: niedrig <24, moderat 24–29, hoch 30–32, extrem >32.
      // Die Ampel übernimmt diese vier Stufen direkt.
      profi: { gruen_max: 23.9, gelb_max: 29.9, orange_max: 32.0 },
      fallback: null,
      sourceId: "fifa_2026",
      interpolationNote:
        "FIFA nutzt vier Risikokategorien (niedrig <24 °C, moderat 24–29 °C, hoch 30–32 °C, extrem >32 °C); unsere Ampel übernimmt sie eins zu eins. Nur die Lücke zwischen 29 und 30 °C wird geschlossen. Verpflichtende Cooling Breaks und die Empfehlung zur Verlegung hängen an der obersten Stufe (>32 °C) – die unteren Stufen beschreiben Risiko, keine FIFA-Pflichtmaßnahme.",
      alternative: {
        sourceId: "fifpro",
        cooling_break_ab: 26.0,
        verlegung_empfohlen_ab: 28.0,
      },
    },
  },
  tennis: {
    id: "tennis",
    label: "Tennis",
    surfaces: ["grass", "clay_red", "clay_red_dry", "hardcourt"],
    untergruende: {
      grass: {
        name: "Rasen",
        wbgtOffset: 0,
        konfidenz: "niedrig",
        quelle_id: "pryor_2017",
      },
      clay_red: {
        name: "Sandplatz (frisch gewässert)",
        wbgtOffset: 0,
        konfidenz: "niedrig",
        quelle_id: "pryor_2017",
      },
      clay_red_dry: {
        name: "Sandplatz (trocken)",
        wbgtOffset: 1.0,
        offsetRange: [0, 2],
        konfidenz: "mittel",
        quelle_id: "pryor_2017",
        hazardWarning:
          "Feldstudie: Sand/Asche teils heißer als Hardcourt – Rangfolge nicht eindeutig.",
      },
      hardcourt: {
        name: "Hardcourt / Acryl",
        wbgtOffset: 1.2,
        offsetRange: [0.5, 2],
        konfidenz: "mittel",
        quelle_id: "pryor_2017",
        hazardWarning:
          "On-Site-WBGT signifikant über Wetterstationswerten (Pryor 2017).",
      },
    },
    thresholds: {
      profi: { gruen_max: 26.0, gelb_max: 28.0, orange_max: 30.0 },
      fallback: null,
      sourceId: "itf_heat_policy",
      extraPauseAt: 30.1,
      suspensionAt: 32.2,
      interpolationNote:
        "Die ITF nennt zwei Bruchpunkte: 30,1 °C aktiviert die Extreme Weather Policy, 32,2 °C ist Richtwert für eine Unterbrechung. Unsere Ampel schaltet deshalb bei 30,0 °C auf Rot – genau unterhalb der ITF-Schwelle. Die Stufen Gelb (ab 26 °C) und Orange (ab 28 °C) darunter sind eine abgestufte Vorwarnung ohne eigenen ITF-Wert.",
    },
  },
  beachvolleyball: {
    id: "beachvolleyball",
    label: "Beachvolleyball",
    short: "Beach",
    surfaces: ["quartz_sand"],
    untergruende: {
      quartz_sand: {
        name: "Tiefsand",
        wbgtOffset: 1.0,
        offsetRange: [0.5, 1.5],
        konfidenz: "mittel",
        quelle_id: "pryor_2017",
        hazardWarning:
          "Sand strahlt stark (hohe Albedo) – zusätzliche Wärmebelastung für Kopf und Oberkörper, unabhängig vom WBGT.",
      },
    },
    thresholds: {
      profi: null,
      fallback: ACSM_FALLBACK_BOUNDS,
      sourceId: "acsm_fallback_beachvolleyball",
      interpolationNote: ACSM_FALLBACK_NOTE,
    },
  },
  cycling: {
    id: "cycling",
    label: "Radsport",
    surfaces: ["asphalt", "gravel"],
    untergruende: {
      asphalt: asphaltConfig(true),
      gravel: GRAVEL_CONFIG,
    },
    thresholds: {
      // UCI: 5 Stufen. Weiß+Grün → unser Grün (<18 °C); Gelb/Orange/Rot 1:1.
      profi: { gruen_max: 17.9, gelb_max: 22.9, orange_max: 27.9 },
      fallback: null,
      sourceId: "uci_2023",
      interpolationNote:
        "UCI nutzt real 5 Stufen (weiß <15 / grün 15–17,9 / gelb 18–22,9 / orange 23–27,9 / rot ≥28). Weiß und Grün werden in unserer 4-Stufen-Ampel zu Grün zusammengefasst (<18 °C). Keine Informationsverfälschung, da weiß und grün beide „keine Maßnahme nötig“ bedeuten.",
      stageNotes: {
        green: "UCI: weiß+grün, <18 °C",
        yellow: "UCI: gelb, 18–22,9 °C",
        orange: "UCI: orange, 23–27,9 °C",
        red: "UCI: rot, ≥28 °C",
      },
    },
  },
  athletics: {
    id: "athletics",
    label: "Leichtathletik",
    short: "Leichtathletik",
    surfaces: ["tartan", "asphalt", "grass", "gravel"],
    untergruende: {
      tartan: TARTAN_CONFIG,
      asphalt: asphaltConfig(false),
      grass: pendingNatural("Naturrasen"),
      gravel: GRAVEL_CONFIG,
    },
    thresholds: {
      // World Athletics, 5 Stufen: <21 nahezu sicher / 21–25 Vorsicht /
      // 25–28 Warnung / 28–30 starke Warnung / >30 gefährlich.
      profi: { gruen_max: 20.9, gelb_max: 24.9, orange_max: 27.9 },
      fallback: null,
      sourceId: "world_athletics",
      interpolationNote:
        "World Athletics veröffentlicht fünf Stufen (unter 21 °C nahezu sicher, 21–25 °C Vorsicht, 25–28 °C Warnung, 28–30 °C starke Warnung, über 30 °C gefährlich). Unsere Ampel übernimmt die unteren Stufen unverändert und fasst „starke Warnung“ und „gefährlich“ zu Rot zusammen. Für Straßenläufe nutzt der Verband ein abweichendes Flaggensystem – die Werte hier gelten für Stadionwettbewerbe.",
    },
  },
  jogging: {
    id: "jogging",
    label: "Joggen",
    surfaces: ["asphalt", "grass", "gravel", "tartan"],
    untergruende: {
      asphalt: asphaltConfig(false),
      grass: pendingNatural("Naturrasen"),
      gravel: GRAVEL_CONFIG,
      tartan: TARTAN_CONFIG,
    },
    thresholds: {
      profi: null,
      fallback: ACSM_FALLBACK_BOUNDS,
      sourceId: "acsm_general",
      interpolationNote: ACSM_FALLBACK_NOTE,
    },
    hinweisIntern:
      "Eigene Kategorie getrennt von Leichtathletik, da andere Zielgruppe (Freizeitläufer statt Elite-Athleten)",
  },
  fieldhockey: {
    id: "fieldhockey",
    label: "Feldhockey",
    surfaces: ["grass", "hockey_water", "turf_sand"],
    untergruende: {
      grass: pendingNatural("Naturrasen"),
      hockey_water: {
        name: "Vollkunststoffrasen (Wasserplatz)",
        wbgtOffset: 0,
        konfidenz: "mittel",
        quelle_id: "irrigation_studies_turf",
        hinweis:
          "Bewässerter Kunstrasen liegt in der Oberflächentemperatur nah am Naturrasen. Kein WBGT-Zuschlag; Quelle misst Oberfläche, nicht WBGT.",
      },
      turf_sand: {
        name: "Kunstrasen sandverfüllt",
        wbgtOffset: null,
        konfidenz: "nicht_zutreffend",
        quelle_id: "grundstein_cooper_2020",
        hazardWarning:
          "Wie Fußball-Kunstrasen: Verdunstung fehlt, WBGT-Nettoeffekt vermutlich gering. Keine Hockey-Studie.",
      },
    },
    thresholds: {
      profi: null,
      fallback: ACSM_FALLBACK_BOUNDS,
      sourceId: "fih_air_temp",
      interpolationNote: ACSM_FALLBACK_NOTE,
    },
  },
};

/** Reihenfolge im Sportart-Dropdown. */
export const SPORT_ORDER: readonly Sport[] = [
  "football",
  "tennis",
  "beachvolleyball",
  "cycling",
  "jogging",
  "athletics",
  "fieldhockey",
];

export function sportSource(sport: Sport) {
  return sourcesRegistry[SPORTS[sport].thresholds.sourceId];
}

export function sportConfidence(sport: Sport): SourceConfidence {
  return sportSource(sport).konfidenz;
}

export function usesProfiThresholds(sport: Sport): boolean {
  return SPORTS[sport].thresholds.profi !== null;
}

export function baseBoundsForSport(sport: Sport): AmpelBounds {
  const { profi, fallback } = SPORTS[sport].thresholds;
  const bounds = profi ?? fallback;
  if (!bounds) {
    throw new Error(`Keine Schwellen für Sportart ${sport}`);
  }
  return bounds;
}

export function ageThresholdOffset(sport: Sport, ageGroup: AgeBand): number {
  if (!usesProfiThresholds(sport)) return 0;
  return AGE_BAND_OFFSETS[ageGroup];
}

export function effectivePerformanceLevel(
  ageGroup: AgeBand,
  performanceLevel: PerformanceLevel
): PerformanceLevel {
  return ageGroup === "adult" ? performanceLevel : "recreational";
}

export function performanceThresholdOffset(
  sport: Sport,
  ageGroup: AgeBand,
  performanceLevel: PerformanceLevel = DEFAULT_PERFORMANCE
): number {
  if (!usesProfiThresholds(sport)) return 0;
  return PERFORMANCE_OFFSETS[effectivePerformanceLevel(ageGroup, performanceLevel)];
}

export function populationOffset(
  sport: Sport,
  ageGroup: AgeBand,
  performanceLevel: PerformanceLevel = DEFAULT_PERFORMANCE
): number {
  return (
    ageThresholdOffset(sport, ageGroup) +
    performanceThresholdOffset(sport, ageGroup, performanceLevel)
  );
}

/**
 * Angewandte Ampelgrenzen: Verband/Fallback + Alter + Leistung + Intensität.
 * Die Offsets sind Näherungen; zusammen sind sie nicht sicherer.
 */
export function appliedBounds(
  sport: Sport,
  ageGroup: AgeBand,
  intensity: IntensityLevel = DEFAULT_INTENSITY,
  performanceLevel: PerformanceLevel = DEFAULT_PERFORMANCE
): AmpelBounds {
  const base = baseBoundsForSport(sport);
  const offset =
    populationOffset(sport, ageGroup, performanceLevel) +
    intensityThresholdOffset(intensity);
  return {
    gruen_max: base.gruen_max + offset,
    gelb_max: base.gelb_max + offset,
    orange_max: base.orange_max + offset,
  };
}

export function formatOffset(offset: number): string {
  if (offset === 0) return "±0,0 °C";
  const sign = offset < 0 ? "−" : "+";
  return `${sign}${Math.abs(offset).toFixed(1).replace(".", ",")} °C`;
}

/** Wie formatOffset, aber 0 als +0,0 °C (für Intensitätszeile). */
export function formatSignedOffset(offset: number): string {
  if (offset === 0) return "+0,0 °C";
  return formatOffset(offset);
}

export function formatWbgtNumber(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} °C`;
}

function formatDeg(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function getSurfaceConfig(sport: Sport, surface: Surface): UntergrundConfig {
  const configured = SPORTS[sport].untergruende[surface];
  if (configured) return configured;
  const meta = SURFACE_CATALOG[surface];
  return {
    name: meta?.label ?? surface,
    wbgtOffset: 0,
    konfidenz: "niedrig",
    quelle_id: "pending",
    status: "pending_research",
  };
}

/** Zahlen-Offset für die WBGT-Rechnung; 0 wenn nur ein Warnhinweis existiert. */
export function numericSurfaceOffset(sport: Sport, surface: Surface): number {
  return getSurfaceConfig(sport, surface).wbgtOffset ?? 0;
}

export function hasNumericSurfaceOffset(sport: Sport, surface: Surface): boolean {
  return getSurfaceConfig(sport, surface).wbgtOffset != null;
}

export function showsSurfaceSourceInfo(konfidenz: SurfaceConfidence): boolean {
  return konfidenz === "niedrig" || konfidenz === "nicht_zutreffend";
}

const SURFACE_CONFIDENCE_LABEL: Record<SurfaceConfidence, string> = {
  hoch: "hohe Konfidenz",
  mittel: "mittlere Konfidenz",
  niedrig: "niedrige Konfidenz",
  nicht_zutreffend: "Konfidenz nicht zutreffend",
  unbestätigt: "unbestätigte Konfidenz",
};

const SURFACE_CONFIDENCE_SHORT: Record<SurfaceConfidence, string> = {
  hoch: "hoch",
  mittel: "mittel",
  niedrig: "niedrig",
  nicht_zutreffend: "n. z.",
  unbestätigt: "unbestätigt",
};

/** Anzeige in der Auswahlliste; null = Warn-Icon statt Zahl. Immer mit Konfidenz. */
export function surfaceOffsetDisplay(config: UntergrundConfig): string | null {
  if (config.wbgtOffset == null) return null;
  const main =
    config.wbgtOffset === 0
      ? "0,0 °C"
      : `${config.wbgtOffset > 0 ? "+" : "−"}${formatDeg(Math.abs(config.wbgtOffset))} °C`;
  const conf = SURFACE_CONFIDENCE_SHORT[config.konfidenz];
  if (!config.offsetRange) return `${main} · ${conf}`;
  const [lo, hi] = config.offsetRange;
  return `${main} (${formatDeg(lo)}–${formatDeg(hi)}) · ${conf}`;
}

/** Text für den Transparenz-Abschnitt Platzkorrekturen. */
export function surfaceOffsetBreakdownValue(config: UntergrundConfig): string {
  if (config.wbgtOffset == null) {
    return "kein Zahlen-Zuschlag (siehe Warnhinweis unten)";
  }
  const main =
    config.wbgtOffset === 0
      ? "0,0 °C"
      : `${config.wbgtOffset > 0 ? "+" : "−"}${formatDeg(Math.abs(config.wbgtOffset))} °C`;
  const confidence = SURFACE_CONFIDENCE_LABEL[config.konfidenz];
  if (!config.offsetRange) return `${main} (${confidence})`;
  const [lo, hi] = config.offsetRange;
  return `${main} (Schätzung, Bereich ${formatDeg(lo)}–${formatDeg(hi)} °C, ${confidence})`;
}
