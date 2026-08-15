/**
 * Gemeinsame Auswahl-Optionen und Beschriftungen.
 *
 * Wird sowohl vom Formular (`/`) als auch vom Dashboard (`/radar`) genutzt –
 * so gibt es genau eine Quelle für die deutschen Labels.
 *
 * Sportarten und Untergründe kommen aus `sportsConfig.ts`.
 */

import {
  DEFAULT_INTENSITY,
  INTENSITY_LEVELS,
  SPORT_ORDER,
  SPORTS,
  SURFACE_CATALOG,
  ageThresholdOffset,
  formatOffset,
  formatSignedOffset,
  getSurfaceConfig,
  intensityModifier,
  intensityThresholdOffset,
  surfaceOffsetDisplay,
  usesProfiThresholds,
  type IntensityLevel,
  type Sport,
} from "./sportsConfig";
import {
  SHADOW_FACTORS,
  type AgeGroup,
  type EventType,
  type Shadow,
  type Surface,
} from "./wbgtCalculator";

export type { IntensityLevel, Sport };

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

export const AGE_OPTIONS: readonly Option<AgeGroup>[] = [
  {
    value: "recreational",
    label: "Erwachsene (Breitensport)",
    short: "Breitensport",
  },
  {
    value: "youth",
    label: "Kinder/Jugend (U15)",
    short: "U15",
  },
  {
    value: "elite",
    label: "Profis/Akklimatisiert",
    short: "Profi",
  },
];

export const INTENSITY_OPTIONS: readonly Option<IntensityLevel>[] =
  INTENSITY_LEVELS.map((level) => ({
    value: level.id,
    label: level.label,
    short: level.short,
  }));

export { DEFAULT_INTENSITY };

export const EVENT_OPTIONS: readonly Option<EventType>[] = [
  { value: "training", label: "Training" },
  {
    value: "match",
    label: "Spiel (Pflicht-/Freundschaftsspiel)",
    short: "Spiel",
  },
  { value: "tournament", label: "Turnier" },
  { value: "other", label: "Sonstiges" },
];

/** Voreingestellte Dauer in Minuten – richtet sich nach der Art der Belastung. */
export const DURATION_MIN_BY_EVENT: Record<EventType, number> = {
  training: 90,
  match: 120,
  tournament: 180,
  other: 60,
};

export function durationForEvent(eventType: EventType): number {
  return DURATION_MIN_BY_EVENT[eventType] ?? DURATION_MIN_BY_EVENT.training;
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
export const DEFAULT_AGE: AgeGroup = "recreational";
export const DEFAULT_EVENT: EventType = "training";
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

/** Offset der Altersklasse gegenüber der Verbandsschwelle ("−3,0 °C"). */
export function ageOffsetLabel(sport: Sport, ageGroup: AgeGroup): string {
  return formatOffset(ageThresholdOffset(sport, ageGroup));
}

export function intensityOffsetLabel(intensity: IntensityLevel): string {
  return formatSignedOffset(intensityThresholdOffset(intensity));
}

export function intensityLabel(intensity: IntensityLevel): string {
  return intensityModifier(intensity).label;
}

export function ageGroupHint(sport: Sport): string {
  if (!usesProfiThresholds(sport)) {
    return "Fallback-Wert gilt bereits konservativ für alle Altersgruppen.";
  }
  return "Verbandsschwelle −3,0 °C (Breitensport) bzw. −4,0 °C (U15). Profis unverändert. Näherung, nicht altersgruppen-validiert.";
}

export function intensityHint(): string {
  return "Unabhängig vom Ereignis. Grobe ACGIH-Analogie (±1,5 °C), nicht für Sport validiert.";
}

/**
 * Alte localStorage-/URL-Werte (child, adult, senior) auf die neue
 * Dreier-Systematik legen.
 */
export function parseAgeGroup(value: unknown): AgeGroup {
  if (value === "child" || value === "youth") return "youth";
  if (value === "elite") return "elite";
  return DEFAULT_AGE;
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
