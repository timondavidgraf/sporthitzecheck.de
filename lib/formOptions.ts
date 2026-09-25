/**
 * Gemeinsame Auswahl-Optionen und Beschriftungen.
 *
 * Wird sowohl vom Formular (`/`) als auch vom Dashboard (`/prognose`) genutzt –
 * so gibt es genau eine Quelle für die deutschen Labels.
 *
 * Sportarten und Untergründe kommen aus `sportsConfig.ts`.
 */

import {
  DEFAULT_INTENSITY,
  DEFAULT_PERFORMANCE,
  INTENSITY_LEVELS,
  PERFORMANCE_OFFSETS,
  SPORT_ORDER,
  SPORTS,
  SURFACE_CATALOG,
  ageThresholdOffset,
  durationForIntensity,
  eventTypeFromIntensity,
  formatOffset,
  formatSignedOffset,
  getSurfaceConfig,
  intensityFamily,
  intensityModifier,
  intensityThresholdOffset,
  performanceThresholdOffset,
  surfaceOffsetDisplay,
  thresholdSourceShort,
  usesProfiThresholds,
  type IntensityLevel,
  type Sport,
} from "./sportsConfig";
import {
  SHADOW_FACTORS,
  type AgeBand,
  type PerformanceLevel,
  type Shadow,
  type Surface,
} from "./wbgtCalculator";
import type { SourceConfidence, SourceId } from "./sourcesRegistry";

export type { AgeBand, IntensityLevel, PerformanceLevel, Sport };

export interface Option<T extends string> {
  value: T;
  label: string;
  /** Kurzform für die Parameter-Tags im Dashboard */
  short?: string;
  /** Tailwind-Hintergrundklasse für den Farb-Indikator (nur Untergründe) */
  swatch?: string;
  /** Kleines Foto des Untergrunds (nur Platzbedingungen) */
  image?: string;
}

export const SPORT_OPTIONS: readonly Option<Sport>[] = SPORT_ORDER.map((id) => ({
  value: id,
  label: SPORTS[id].label,
  short: SPORTS[id].short,
}));

const AGE_LABELS: Record<
  ReturnType<typeof intensityFamily>,
  Record<AgeBand, { label: string; short: string }>
> = {
  match: {
    youth: { label: "Unter 16 Jahre", short: "U16" },
    adult: { label: "16–64 Jahre", short: "16–64" },
    senior: { label: "65 Jahre und älter", short: "65+" },
  },
  endurance: {
    youth: { label: "Unter 16 Jahre", short: "Jugend" },
    adult: { label: "16–64 Jahre", short: "16–64" },
    senior: { label: "65 Jahre und älter", short: "65+" },
  },
};

export function ageOptionsForSport(sport: Sport): readonly Option<AgeBand>[] {
  const family = intensityFamily(sport);
  return (["youth", "adult", "senior"] as const).map((id) => ({
    value: id,
    ...AGE_LABELS[family][id],
  }));
}

export const PERFORMANCE_OPTIONS: readonly Option<PerformanceLevel>[] = [
  { value: "recreational", label: "Breitensport", short: "Breitensport" },
  {
    value: "elite",
    label: "Professionell / Akklimatisiert",
    short: "Professionell",
  },
];

export function isPerformanceLocked(ageGroup: AgeBand): boolean {
  return ageGroup !== "adult";
}

export { DEFAULT_INTENSITY, DEFAULT_PERFORMANCE, durationForIntensity, eventTypeFromIntensity };

export const INTENSITY_OPTIONS: readonly Option<IntensityLevel>[] = INTENSITY_LEVELS.map(
  (level) => ({ value: level.id, label: level.label, short: level.short })
);

/**
 * Hinweis unter der Altersklasse, wenn die Sportart keine Verbandsschwelle hat:
 * Die ACSM-Skala gilt dann für alle, nur 65+ verschiebt die Ampel – ohne
 * Hinweis wirkt die Auswahl wirkungslos.
 */
export function populationFieldsHint(sport: Sport): string | undefined {
  if (usesProfiThresholds(sport)) return undefined;
  return "Bei dieser Sportart gilt die ACSM-Skala: nur 65+ verschiebt die Ampel (−1 °C), die Leistungsstufe nicht.";
}

/** Intensität aus URL/localStorage; Unbekanntes fällt auf den Standard zurück. */
export function parseIntensity(value: unknown): IntensityLevel {
  return parseOption(value, INTENSITY_OPTIONS, DEFAULT_INTENSITY);
}

function surfaceOption(sport: Sport, surface: Surface): Option<Surface> {
  const meta = SURFACE_CATALOG[surface];
  const config = getSurfaceConfig(sport, surface);
  return {
    value: surface,
    label: config.name,
    short: meta.short,
    swatch: meta.swatch,
    image: meta.image,
  };
}

/**
 * Untergründe je Sportart. Ein Wert kann in mehreren Sportarten vorkommen
 * (Rasen bei Fußball und Tennis) – Label kann sich dann unterscheiden.
 */
export const SURFACES_BY_SPORT: Record<Sport, readonly Option<Surface>[]> = {
  football: SPORTS.football.surfaces.map((surface) => surfaceOption("football", surface)),
  tennis: SPORTS.tennis.surfaces.map((surface) => surfaceOption("tennis", surface)),
  beachvolleyball: SPORTS.beachvolleyball.surfaces.map((surface) =>
    surfaceOption("beachvolleyball", surface)
  ),
  cycling: SPORTS.cycling.surfaces.map((surface) => surfaceOption("cycling", surface)),
  athletics: SPORTS.athletics.surfaces.map((surface) => surfaceOption("athletics", surface)),
  jogging: SPORTS.jogging.surfaces.map((surface) => surfaceOption("jogging", surface)),
  fieldhockey: SPORTS.fieldhockey.surfaces.map((surface) =>
    surfaceOption("fieldhockey", surface)
  ),
};

/** Flache, duplikatfreie Liste – für Label-Suche und URL-Validierung. */
export const ALL_SURFACE_OPTIONS: readonly Option<Surface>[] = Object.values(
  SURFACES_BY_SPORT
)
  .flat()
  .filter((option, i, arr) => arr.findIndex((o) => o.value === option.value) === i);

export const SHADOW_OPTIONS: readonly Option<Shadow>[] = [
  { value: "none", label: "Volle Sonne", short: "Volle Sonne" },
  {
    value: "partial",
    label: "Halbschatten z.B. durch Bäume/Tribüne",
    short: "Halbschatten",
  },
  { value: "full", label: "Komplett beschattet", short: "Beschattet" },
];

export const DEFAULT_SPORT: Sport = "football";
export const DEFAULT_AGE: AgeBand = "adult";
export const DEFAULT_SHADOW: Shadow = "none";
export const DEFAULT_SURFACE: Surface = "grass";

/** Untergrund-Auswahl der Sportart; fällt bei unbekannter Sportart auf Fußball zurück. */
export function surfacesForSport(sport: Sport): readonly Option<Surface>[] {
  return SURFACES_BY_SPORT[sport] ?? SURFACES_BY_SPORT[DEFAULT_SPORT];
}

/**
 * Gültiger Untergrund für eine Sportart: der bisherige, falls die neue Sportart
 * ihn anbietet – sonst der erste ihrer Liste (Beachvolleyball hat nur Quarzsand).
 */
export function surfaceForSport(sport: Sport, current: Surface): Surface {
  const available = surfacesForSport(sport);
  return available.some((o) => o.value === current) ? current : available[0].value;
}

/** Offset des Untergrunds in °C; null = Warn-Icon statt Zahl. */
export function surfaceOffsetLabel(sport: Sport, surface: Surface): string | null {
  return surfaceOffsetDisplay(getSurfaceConfig(sport, surface));
}

/** Offset der Altersklasse gegenüber der Verbandsschwelle. */
export function ageOffsetLabel(sport: Sport, ageGroup: AgeBand): string {
  return formatOffset(ageThresholdOffset(sport, ageGroup));
}

export function performanceOffsetLabel(
  sport: Sport,
  ageGroup: AgeBand,
  performanceLevel: PerformanceLevel
): string {
  return formatOffset(performanceThresholdOffset(sport, ageGroup, performanceLevel));
}

export function intensityOffsetLabel(intensity: IntensityLevel): string {
  return formatSignedOffset(intensityThresholdOffset(intensity));
}

export interface OffsetTooltipContent {
  body: string;
  confidence: SourceConfidence;
  sourceIds: SourceId[];
}

export function ageGroupTooltip(
  sport: Sport,
  ageGroup: AgeBand
): OffsetTooltipContent {
  if (!usesProfiThresholds(sport)) {
    if (ageGroup === "senior") {
      return {
        body: `Zusätzlich ${formatOffset(-1)} zur ACSM-Skala. Ältere Erwachsene erreichen die Grenze, ab der der Körper Wärme nicht mehr abgeben kann, deutlich früher – im Labor bei leichter Aktivität rund 2–3 °C WBGT früher als junge Erwachsene (Wolf et al. 2023). Fitte, hitzegewöhnte Ältere regulieren beim Training oft besser; der kleine Abzug ist deshalb vorsichtig bemessen.`,
        confidence: "mittel",
        sourceIds: ["aging_heat", SPORTS[sport].thresholds.sourceId],
      };
    }
    return {
      body: `Die ACSM-Skala gilt bereits für nicht akklimatisierte Freizeitsportler:innen. Unter 16 gibt es keinen Extra-Abzug: Kinder regulieren bei ausreichender Flüssigkeit ähnlich gut wie Erwachsene. Nur 65+ erhält ${formatOffset(-1)}.`,
      confidence: "mittel",
      sourceIds: [SPORTS[sport].thresholds.sourceId, "notley_2025_youth"],
    };
  }
  const short = thresholdSourceShort(sport);
  if (ageGroup === "youth") {
    return {
      body: `Zusätzlich ${formatOffset(-1)} zur ${short}-Schwelle. Neuere Studien (AAP 2011/2019, Notley et al. 2025) zeigen: Kinder regulieren bei ausreichender Flüssigkeit ähnlich gut wie Erwachsene. Der kleine Abzug ist Vorsicht wegen Aufsicht und Belastungsteuerung, keine Physiologie. Der ACSM führt Kinder trotzdem als Risikogruppe.`,
      confidence: "niedrig",
      sourceIds: ["notley_2025_youth", "acsm_general"],
    };
  }
  if (ageGroup === "senior") {
    return {
      body: `Zusätzlich ${formatOffset(-1)} zur ${short}-Schwelle. Richtung belegt: ab etwa 60 Jahren sinken Schweißrate und Hautdurchblutung, die kritischen Umweltgrenzen liegen niedriger (Meade et al. 2023; CDC 65+). Kein Verband nennt einen °C-Wert – der Betrag ist gesetzt, nicht abgeleitet.`,
      confidence: "mittel",
      sourceIds: ["aging_heat"],
    };
  }
  return {
    body: `Kein Altersabzug: die ${short}-Schwelle gilt für Erwachsene. Unter 16 und 65+ je ${formatOffset(-1)} extra – Jugend als Vorsicht, 65+ weil die Thermoregulation im Alter nachlässt.`,
    confidence: "hoch",
    sourceIds: [SPORTS[sport].thresholds.sourceId],
  };
}

export function performanceTooltip(
  sport: Sport,
  performanceLevel: PerformanceLevel
): OffsetTooltipContent {
  if (!usesProfiThresholds(sport)) {
    return {
      body: "Die ACSM-Skala gilt bereits für gesunde Erwachsene ohne Verbands-Profi-Schwelle. Zusätzlicher Abzug nach Leistungsstufe: keiner.",
      confidence: "mittel",
      sourceIds: [SPORTS[sport].thresholds.sourceId],
    };
  }
  const short = thresholdSourceShort(sport);
  const recOffset = formatOffset(PERFORMANCE_OFFSETS.recreational);
  if (performanceLevel === "elite") {
    return {
      body: `Kein Abzug: die ${short}-Werte gelten für den Profi-/Wettkampfbetrieb, also für fitte, meist hitzeakklimatisierte Athlet:innen. Breitensport erhält ${recOffset}.`,
      confidence: "hoch",
      sourceIds: [SPORTS[sport].thresholds.sourceId, "acsm_general"],
    };
  }
  return {
    body: `Die ${short}-Werte gelten für Profis und akklimatisierte Leistungssportler. Der ACSM Position Stand (2007, Tabelle 2) setzt dieselben Maßnahmen für nicht akklimatisierte, weniger fitte Personen rund 2 °C früher an (Abbruch 30,1 vs. 32,3 °C). Abzug daher ${recOffset} gemäß Studienlage – Analogie, kein Verbandswert.`,
    confidence: "mittel",
    sourceIds: ["acsm_general", SPORTS[sport].thresholds.sourceId],
  };
}

export function intensityTooltip(intensity: IntensityLevel): OffsetTooltipContent {
  const modifier = intensityModifier(intensity);
  const offset = formatSignedOffset(modifier.schwellenOffset);
  return {
    body: `${modifier.label} verschiebt die Ampelschwellen um ${offset}. Grundlage: ACGIH-Arbeitsmodell (mehr Pause → höhere zulässige WBGT, durchgehende schwere Arbeit → niedrigere). Nicht für Sport validiert. Verschiebt die Schwellen, nicht den berechneten WBGT.`,
    confidence: "niedrig",
    sourceIds: ["acgih_tlv"],
  };
}

/** Altersklasse aus URL/localStorage; Unbekanntes fällt auf den Standard zurück. */
export function parseAgeGroup(value: unknown): AgeBand {
  if (value === "youth" || value === "adult" || value === "senior") return value;
  return DEFAULT_AGE;
}

/** Leistungsstufe aus URL/localStorage. Jugend und 65+ sind immer Breitensport. */
export function parsePerformanceLevel(value: unknown, ageGroup: AgeBand): PerformanceLevel {
  if (isPerformanceLocked(ageGroup)) return "recreational";
  return value === "elite" ? "elite" : DEFAULT_PERFORMANCE;
}

/** Anteil der Direktstrahlung bzw. des Untergrund-Zuschlags ("50 %"). */
export function shadowFactorLabel(shadow: Shadow): string {
  return `${Math.round((SHADOW_FACTORS[shadow] ?? 1) * 100)} %`;
}

/**
 * Nimmt nur bekannte Werte an – schützt gleichermaßen vor veralteten
 * localStorage-Einträgen und manipulierten URL-Parametern.
 */
export function parseOption<T extends string>(
  value: unknown,
  options: readonly Option<T>[],
  fallback: T
): T {
  return options.some((o) => o.value === value) ? (value as T) : fallback;
}

/** Untergrund aus URL/localStorage; muss zur Sportart passen. */
export function parseSurface(value: unknown, sport: Sport): Surface {
  return surfaceForSport(sport, parseOption(value, ALL_SURFACE_OPTIONS, DEFAULT_SURFACE));
}

export function labelFor<T extends string>(
  options: readonly Option<T>[],
  value: T
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Kurzform, falls vorhanden – sonst das normale Label. */
export function shortLabelFor<T extends string>(
  options: readonly Option<T>[],
  value: T
): string {
  const option = options.find((o) => o.value === value);
  return option?.short ?? option?.label ?? value;
}
