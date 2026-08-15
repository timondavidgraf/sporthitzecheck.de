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
  durationForIntensity,
  eventTypeFromIntensity,
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

export { DEFAULT_INTENSITY, durationForIntensity, eventTypeFromIntensity };

export function intensityOptionsForSport(
  sport: Sport
): readonly Option<IntensityLevel>[] {
  return INTENSITY_LEVELS.map((level) => {
    const modifier = intensityModifier(level.id, sport);
    return {
      value: level.id,
      label: modifier.label,
      short: modifier.short,
    };
  });
}

/**
 * URL/localStorage: `intensity` hat Vorrang. Fehlt sie, wird ein altes `event=`
 * auf die nächste Intensität gelegt (Training→easy, Spiel→normal, Turnier→intense).
 */
export function parseIntensity(
  intensityParam: unknown,
  eventParam?: unknown
): IntensityLevel {
  if (
    intensityParam === "easy" ||
    intensityParam === "normal" ||
    intensityParam === "intense"
  ) {
    return intensityParam;
  }
  if (eventParam === "training") return "easy";
  if (eventParam === "tournament") return "intense";
  if (eventParam === "match") return "normal";
  return DEFAULT_INTENSITY;
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

export function ageGroupHint(sport: Sport): string {
  if (!usesProfiThresholds(sport)) {
    return "Fallback-Wert gilt bereits konservativ für alle Altersgruppen.";
  }
  return "Verbandsschwelle −3,0 °C (Breitensport) bzw. −4,0 °C (U15). Profis unverändert. Näherung, nicht altersgruppen-validiert.";
}

export function intensityHint(): string {
  return "Näherung nach ACGIH, nicht für Sport validiert. Verschiebt die Ampelschwellen, nicht den WBGT.";
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
