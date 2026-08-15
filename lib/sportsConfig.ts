/**
 * Sportarten, Untergründe und Ampel-Schwellen an einer Stelle.
 *
 * Schwellen stammen aus `sourcesRegistry`. Wo ein Verband keine 4 Stufen
 * definiert, steht das im Kommentar und in der Quelle – Zwischenstufen
 * sind dann UI-Interpolation, keine offizielle Verbandszahl.
 */

import type { AgeGroup, ColorCode, Surface } from "./wbgtCalculator";
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
  /** null = kein Zahlen-Offset, nur qualitativer Warnhinweis. */
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
 * Offset von der Profi-Verbandsschwelle. Nur wenn `profi` gesetzt ist.
 * Größe angelehnt an die Differenz Elite vs. ACSM-Massenveranstaltung (~3–4 °C),
 * nicht direkt für einzelne Altersgruppen validiert.
 */
export const AGE_THRESHOLD_OFFSETS: Record<AgeGroup, number> = {
  recreational: -3.0,
  youth: -4.0,
  elite: 0,
};

export type IntensityLevel = "easy" | "normal" | "intense";

export interface IntensityModifier {
  id: IntensityLevel;
  label: string;
  short: string;
  schwellenOffset: number;
  quelle_id: "acgih_tlv";
}

/**
 * Sportartübergreifend, ACGIH-Analogie. Sicherheits-Näherung, nicht für Sport
 * validiert – gilt genauso wie der Alters-Offset, die Kombination erhöht die
 * Sicherheit nicht.
 */
export const INTENSITY_LEVELS: readonly IntensityModifier[] = [
  {
    id: "easy",
    label: "Lockeres Auslaufen/Technik (viele Pausen)",
    short: "Locker",
    schwellenOffset: 1.5,
    quelle_id: "acgih_tlv",
  },
  {
    id: "normal",
    label: "Normales Training (regelmäßige Pausen)",
    short: "Normal",
    schwellenOffset: 0,
    quelle_id: "acgih_tlv",
  },
  {
    id: "intense",
    label: "Wettkampf/intensive Belastung (wenig Pausen)",
    short: "Intensiv",
    schwellenOffset: -1.5,
    quelle_id: "acgih_tlv",
  },
];

export const DEFAULT_INTENSITY: IntensityLevel = "normal";
export const INTENSITY_SOURCE_ID = "acgih_tlv" as const;

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
  },
  gravel: {
    label: "Waldweg/Schotter",
    short: "Schotter",
    swatch: "bg-stone-400",
  },
  tartan: {
    label: "Tartanbahn/Polyurethan",
    short: "Tartan",
    swatch: "bg-red-500",
  },
  hockey_water: {
    label: "Vollkunststoffrasen (Wasserplatz)",
    short: "Wasserplatz",
    swatch: "bg-sky-500",
  },
  turf_sand: {
    label: "Kunstrasen sandverfüllt",
    short: "Kunstrasen Sand",
    swatch: "bg-lime-700",
  },
};

const KUNSTRASEN_WARNING =
  "Achtung Oberflächenhitze: Kunstrasen kann sich auf über 50–60 °C aufheizen. WBGT-Risiko ist laut Studienlage NICHT erhöht (Verdunstungskühlung über Naturrasen gleicht die höhere Strahlungswärme aus), aber es besteht Gefahr für Kontaktverbrennungen/Blasen bei Stürzen oder direktem Hautkontakt, sowie erhöhtes subjektives Hitzeempfinden. Im Schatten deutlich geringer.";

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
    "Tartanbahnen können sich stark aufheizen, on-site WBGT-Messungen lagen signifikant über Wetterstationswerten.",
};

const ASPHALT_CONFIG: UntergrundConfig = {
  name: "Asphalt/Straße",
  wbgtOffset: null,
  konfidenz: "nicht_zutreffend",
  quelle_id: "pending",
  hazardWarning:
    "Hohe Wärmespeicherung und -rückstrahlung von Asphalt sind gut dokumentiert (Straßenoberflächen erreichen im Sommer deutlich höhere Temperaturen als Luft), aber keine sportartübergreifend belastbare WBGT-Zahl gefunden – anders als bei Kunstrasen (Fußball) existiert für Asphalt im Sport-/Freizeitkontext keine vergleichbare Feldstudie. Beim Radfahren zusätzlich zu beachten: Fahrtwind kühlt bei konstanter Geschwindigkeit, dieser Effekt entfällt bei langsamer Bergauffahrt oder beim Laufen weitgehend.",
};

const GRAVEL_CONFIG: UntergrundConfig = {
  name: "Waldweg/Schotter",
  wbgtOffset: 0,
  konfidenz: "mittel",
  quelle_id: "john_2024_canopy",
  kein_offset_grund:
    "Der Kühleffekt von Waldschatten (bis zu 3–4 °C geringere Lufttemperatur unter Kronendach gegenüber Freifläche laut Studie) wird bereits über das separate Beschattung-Feld erfasst. Ein zusätzlicher Untergrund-Offset würde denselben Effekt doppelt zählen.",
  hinweis:
    "Waldwege bieten oft natürlichen Schatten – bitte „Beschattung“ entsprechend anpassen (Halbschatten/Komplett beschattet), statt hier auf einen separaten Zuschlag zu warten.",
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
          "Ähnlicher Mechanismus wie Kunstrasen erwartet (geringere Verdunstung als Naturrasen), aber keine surface-spezifische Studie für diesen Belag gefunden – Einschätzung durch Analogie, nicht direkt belegt.",
      },
    },
    thresholds: {
      // FIFA definiert real nur 2 Bruchpunkte (27 °C freiwillig, 32 °C verpflichtend).
      // Gelb/Orange innerhalb 27–32 °C ist UI-Interpolation, kein FIFA-Zwischenwert.
      profi: { gruen_max: 27.0, gelb_max: 29.9, orange_max: 31.9 },
      fallback: null,
      sourceId: "fifa_2026",
      interpolationNote:
        "FIFA definiert real nur 2 Bruchpunkte (27 °C freiwillige, 32 °C verpflichtende Cooling Breaks). Die Unterteilung Gelb/Orange innerhalb 27–32 °C ist eine UI-Interpolation zur graduellen Risikokommunikation, kein offizieller FIFA-Zwischenwert.",
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
          "Japanische Feldstudie fand sandverfüllte/Asche-Plätze z. T. in höherer Gefahrenkategorie als Hardcourt – Rangfolge ist nicht so eindeutig wie oft angenommen.",
      },
      hardcourt: {
        name: "Hardcourt / Acryl",
        wbgtOffset: 1.2,
        offsetRange: [0.5, 2],
        konfidenz: "mittel",
        quelle_id: "pryor_2017",
        hazardWarning:
          "On-Site-Messungen signifikant über Wetterstations-Werten (Pryor et al. 2017).",
      },
    },
    thresholds: {
      profi: { gruen_max: 26.0, gelb_max: 28.0, orange_max: 30.0 },
      fallback: null,
      sourceId: "itf_heat_policy",
      extraPauseAt: 30.1,
      suspensionAt: 32.2,
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
          "Sand reflektiert UV- und Infrarotstrahlung stark (hohe Albedo) – Kopf-/Oberkörperbereich zusätzlicher thermischer Strahlung ausgesetzt, unabhängig vom WBGT-Wert.",
      },
    },
    thresholds: {
      profi: null,
      fallback: { gruen_max: 18.0, gelb_max: 23.0, orange_max: 28.0 },
      sourceId: "acsm_fallback_beachvolleyball",
    },
  },
  cycling: {
    id: "cycling",
    label: "Radsport",
    surfaces: ["asphalt", "gravel"],
    untergruende: {
      asphalt: ASPHALT_CONFIG,
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
    label: "Leichtathletik/Wettkampf",
    short: "Leichtathletik",
    surfaces: ["tartan", "asphalt", "grass", "gravel"],
    untergruende: {
      tartan: TARTAN_CONFIG,
      asphalt: ASPHALT_CONFIG,
      grass: pendingNatural("Naturrasen"),
      gravel: GRAVEL_CONFIG,
    },
    thresholds: {
      // World Athletics: 3 benannte Stufen (25 / 28 / 30 °C), kein voller 4-Stufen-Katalog.
      profi: { gruen_max: 24.9, gelb_max: 27.9, orange_max: 29.9 },
      fallback: null,
      sourceId: "world_athletics",
      interpolationNote:
        "World Athletics nennt 3 benannte Stufen (Warnung 25 °C, starke Warnung 28 °C, gefährlich 30 °C) ohne einen durchgängig publizierten, vollständigen Stufenkatalog wie UCI/FIFA – daher Konfidenz mittel statt hoch.",
    },
  },
  jogging: {
    id: "jogging",
    label: "Joggen",
    surfaces: ["asphalt", "grass", "gravel", "tartan"],
    untergruende: {
      asphalt: ASPHALT_CONFIG,
      grass: pendingNatural("Naturrasen"),
      gravel: GRAVEL_CONFIG,
      tartan: TARTAN_CONFIG,
    },
    thresholds: {
      profi: null,
      fallback: { gruen_max: 17.9, gelb_max: 22.9, orange_max: 27.9 },
      sourceId: "acsm_general",
    },
    hinweisIntern:
      "Eigene Kategorie getrennt von Leichtathletik/Wettkampf, da andere Zielgruppe (Freizeitläufer statt Elite-Athleten)",
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
          "Bewässerungsstudien an Kunstrasen zeigen, dass aktiv bewässerte/wassergeflutete Kunstrasenflächen in der Oberflächentemperatur nah an Naturrasen herankommen (Differenz oft nur ca. 2 °C), während unbewässerter Kunstrasen 60–80 °C erreichen kann. Da WBGT auf Oberflächentemperatur-Unterschiede ohnehin gedämpft reagiert (siehe Fußball-Kunstrasen-Befund), wird hier kein Zuschlag angesetzt – Konfidenz mittel, da die Quelle Oberflächentemperatur misst, nicht direkt WBGT für Hockey-Wasserplätze.",
      },
      turf_sand: {
        name: "Kunstrasen sandverfüllt",
        wbgtOffset: null,
        konfidenz: "nicht_zutreffend",
        quelle_id: "grundstein_cooper_2020",
        hazardWarning:
          "Gleicher Mechanismus wie beim sandverfüllten Fußball-Kunstrasen erwartet (Verdunstungskühlung fehlt, aber WBGT-Nettoeffekt vermutlich gering) – keine hockeyspezifische Studie gefunden, Übertragung durch Analogie zu Fußball-Kunstrasen-Befunden.",
      },
    },
    thresholds: {
      profi: null,
      fallback: { gruen_max: 17.9, gelb_max: 22.9, orange_max: 27.9 },
      sourceId: "fih_air_temp",
    },
  },
};

/** Reihenfolge im Sportart-Dropdown. */
export const SPORT_ORDER: readonly Sport[] = [
  "football",
  "tennis",
  "beachvolleyball",
  "cycling",
  "athletics",
  "jogging",
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

export function ageThresholdOffset(sport: Sport, ageGroup: AgeGroup): number {
  if (!usesProfiThresholds(sport)) return 0;
  return AGE_THRESHOLD_OFFSETS[ageGroup];
}

export function intensityModifier(level: IntensityLevel): IntensityModifier {
  return INTENSITY_LEVELS.find((item) => item.id === level) ?? INTENSITY_LEVELS[1];
}

export function intensityThresholdOffset(level: IntensityLevel): number {
  return intensityModifier(level).schwellenOffset;
}

/** Label ohne Klammerzusatz, z. B. „Normales Training“. */
export function intensityHeadline(level: IntensityLevel): string {
  return intensityModifier(level).label.replace(/\s*\(.*\)$/, "");
}

/**
 * Angewandte Ampelgrenzen: Verband/Fallback + Alters-Offset + Intensitäts-Offset.
 * Beide Offsets sind Näherungen; zusammen sind sie nicht sicherer.
 */
export function appliedBounds(
  sport: Sport,
  ageGroup: AgeGroup,
  intensity: IntensityLevel = DEFAULT_INTENSITY
): AmpelBounds {
  const base = baseBoundsForSport(sport);
  const offset =
    ageThresholdOffset(sport, ageGroup) + intensityThresholdOffset(intensity);
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
