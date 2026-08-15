/**
 * Gemeinsame Auswahl-Optionen und Beschriftungen.
 *
 * Wird sowohl vom Formular (`/`) als auch vom Dashboard (`/radar`) genutzt –
 * so gibt es genau eine Quelle für die deutschen Labels.
 *
 * Die WBGT-Offsets der Untergründe stehen absichtlich NICHT hier, sondern in
 * `SURFACE_OFFSETS` in `wbgtCalculator.ts`: Domänenlogik gehört nicht in die
 * UI-Schicht. Für die Anzeige werden sie von dort importiert.
 */

import { AGE_OFFSETS, SHADOW_FACTORS, SURFACE_OFFSETS, type AgeGroup, type EventType, type Shadow, type Surface } from './wbgtCalculator';

export type Sport = 'football' | 'tennis' | 'beachvolleyball';

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

export const SPORT_OPTIONS: readonly Option<Sport>[] = [
  { value: 'football', label: 'Fußball' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'beachvolleyball', label: 'Beachvolleyball', short: 'Beach' },
];

export const AGE_OPTIONS: readonly Option<AgeGroup>[] = [
  {
    value: 'child',
    label: 'Kinder (U13 und jünger)',
    short: 'Kinder',
  },
  {
    value: 'youth',
    label: 'Jugend (U14 bis U19)',
    short: 'Jugend',
  },
  { value: 'adult', label: 'Erwachsene (Aktive)', short: 'Aktive' },
  {
    value: 'senior',
    label: 'Erwachsene (Ü35)',
    short: 'Ü35',
  },
];

export const EVENT_OPTIONS: readonly Option<EventType>[] = [
  { value: 'training', label: 'Training' },
  {
    value: 'match',
    label: 'Spiel (Pflicht-/Freundschaftsspiel)',
    short: 'Spiel',
  },
  { value: 'tournament', label: 'Turnier' },
  { value: 'other', label: 'Sonstiges' },
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

/**
 * Untergründe je Sportart. Ein Wert kann in mehreren Sportarten vorkommen
 * (Rasen bei Fußball und Tennis) – Label und Farbe bleiben dann identisch.
 */
export const SURFACES_BY_SPORT: Record<Sport, readonly Option<Surface>[]> = {
  football: [
    {
      value: 'grass',
      label: 'Naturrasen',
      swatch: 'bg-green-500',
      image: '/surfaces/grass.png',
    },
    {
      value: 'turf_black',
      label: 'Kunstrasen SBR / schwarz',
      short: 'Kunstrasen SBR',
      swatch: 'bg-gray-800',
      image: '/surfaces/turf_black.png',
    },
    {
      value: 'turf_light',
      label: 'Kunstrasen Kork / hell',
      short: 'Kunstrasen Kork',
      swatch: 'bg-amber-700',
      image: '/surfaces/turf_light.png',
    },
    {
      value: 'sand_clay',
      label: 'Asche / roter Hartplatz',
      short: 'Asche',
      swatch: 'bg-red-700',
      image: '/surfaces/sand_clay.png',
    },
  ],
  tennis: [
    {
      value: 'clay_red',
      label: 'Roter Sandplatz',
      short: 'Sandplatz',
      swatch: 'bg-red-600',
      image: '/surfaces/clay_red.png',
    },
    {
      value: 'hardcourt',
      label: 'Hardcourt / Acryl',
      short: 'Hardcourt',
      swatch: 'bg-blue-600',
      image: '/surfaces/hardcourt.png',
    },
    {
      value: 'grass',
      label: 'Rasen',
      swatch: 'bg-green-500',
      image: '/surfaces/grass.png',
    },
  ],
  beachvolleyball: [
    {
      value: 'quartz_sand',
      label: 'Quarzsand',
      swatch: 'bg-yellow-200',
      image: '/surfaces/quartz_sand.png',
    },
  ],
};

/** Flache, duplikatfreie Liste – für Label-Suche und URL-Validierung. */
export const ALL_SURFACE_OPTIONS: readonly Option<Surface>[] = Object.values(SURFACES_BY_SPORT)
  .flat()
  .filter((option, i, arr) => arr.findIndex((o) => o.value === option.value) === i);

export const SHADOW_OPTIONS: readonly Option<Shadow>[] = [
  { value: 'none', label: 'Volle Sonne', short: 'Volle Sonne' },
  {
    value: 'partial',
    label: 'Halbschatten z.B. durch Bäume/Tribüne',
    short: 'Halbschatten',
  },
  { value: 'full', label: 'Komplett beschattet', short: 'Beschattet' },
];

export const DEFAULT_SPORT: Sport = 'football';
export const DEFAULT_AGE: AgeGroup = 'adult';
export const DEFAULT_EVENT: EventType = 'training';
export const DEFAULT_SHADOW: Shadow = 'none';
export const DEFAULT_SURFACE: Surface = 'grass';

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

/** Offset des Untergrunds in °C, formatiert für die Anzeige ("+4.5 °C"). */
export function surfaceOffsetLabel(surface: Surface): string {
  const offset = SURFACE_OFFSETS[surface] ?? 0;
  return `${offset > 0 ? '+' : ''}${offset.toFixed(1)} °C`;
}

/** Schwellen-Offset der Altersklasse ("−1.5 °C" / "0.0 °C"). */
export function ageOffsetLabel(ageGroup: AgeGroup): string {
  const offset = AGE_OFFSETS[ageGroup] ?? 0;
  if (offset === 0) return '0.0 °C';
  return `${offset < 0 ? '−' : '+'}${Math.abs(offset).toFixed(1)} °C`;
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
