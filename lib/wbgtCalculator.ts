/**
 * SportHitzeCheck – WBGT Berechnung & Datenbeschaffung (Sprint 1)
 *
 * Enthaelt:
 *  - fetchWeatherData(): Open-Meteo Abruf inkl. localStorage-Cache (TTL 60 Min)
 *  - calculateWBGTForecast(): WBGT-Naeherung + Untergrund-/Schatten-/Bewaesserungs-Logik
 *  - Ampel-Kategorisierung nach FIFA/ACSM plus Breitensport- und Alters-Offsets
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type Surface =
  // Fußball
  | 'grass'
  | 'turf_black'
  | 'turf_light'
  | 'sand_clay'
  // Tennis
  | 'clay_red'
  | 'hardcourt'
  // Beachvolleyball
  | 'quartz_sand';
export type Shadow = 'none' | 'partial' | 'full';
export type AgeGroup = 'child' | 'youth' | 'adult' | 'senior';
export type EventType = 'training' | 'match' | 'tournament' | 'other';
export type ColorCode = 'green' | 'yellow' | 'orange' | 'red';

export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    direct_radiation: number[];
    diffuse_radiation: number[];
  };
}

/** Einzelposten der Berechnung – Grundlage für das Transparenz-Modul im Dashboard. */
export interface WBGTBreakdown {
  /** Open-Meteo: Lufttemperatur in °C */
  temperature: number;
  /** Open-Meteo: relative Feuchte in % */
  humidity: number;
  /** Open-Meteo: Wind in m/s */
  wind: number;
  /** Open-Meteo: Direktstrahlung in W/m² */
  directRadiation: number;
  /** Open-Meteo: diffuse Himmelsstrahlung in W/m² */
  diffuseRadiation: number;

  /** 1.0 / 0.5 / 0.0 – Anteil der Direktstrahlung und des Untergrund-Offsets */
  shadowFactor: number;
  /** 1.0 / 0.8 / 0.25 – Anteil der diffusen Strahlung */
  diffuseFactor: number;
  /** Direktstrahlung nach Beschattung */
  effectiveDirect: number;
  /** Diffuse Strahlung nach Beschattung */
  effectiveDiffuse: number;

  /** Feuchtkugel Tw nach Stull */
  wetBulb: number;
  /** 0.8·Gdir + 0.4·Gdif ohne Beschattung */
  solarUnshaded: number;
  /** dieselbe Solarlast mit beschatteter Strahlung */
  solarShaded: number;
  /** Tg − Ta ohne Beschattung (vor der 20-K-Kappe) */
  globeDeltaUnshaded: number;
  /** Tg − Ta mit Beschattung */
  globeDeltaShaded: number;
  /** true, wenn der Tg-Zuschlag auf 20 K begrenzt wurde */
  globeDeltaCapped: boolean;
  globeUnshaded: number;
  globeShaded: number;

  /** WBGT nur aus den Wetterdaten bei voller Sonne, ohne Platz-Einflüsse */
  baseWbgt: number;
  /** WBGT aus den Wetterdaten nach Beschattung der Strahlung */
  shadedWbgt: number;
  /** shadedWbgt − baseWbgt (<= 0) */
  shadeRadiationAdjustment: number;

  /** Roher Untergrund-Offset laut Tabelle, noch ohne Beschattung */
  surfaceOffset: number;
  /** Untergrund-Offset nach Beschattungsfaktor */
  effectiveSurfaceOffset: number;
  /** Was die Beschattung vom Untergrund-Offset wegnimmt (<= 0) */
  shadowAdjustment: number;
  /** 0 oder −WATERING_COOLING – nur in der ersten Stunde aktiv */
  wateringOffset: number;
  /** Gewählte Option: Platz wird gewässert */
  watered: boolean;
}

export interface WBGTHour {
  /** ISO-Zeitstempel der Stunde, wie von Open-Meteo geliefert (lokale Zeit des Ortes) */
  timestamp: string;
  /** Finaler WBGT-Wert in °C, auf eine Nachkommastelle gerundet */
  wbgtValue: number;
  colorCode: ColorCode;
  recommendationLabel: string;
  recommendationPoints: string[];
  /** Liegt diese Stunde im angegebenen Zeitraum der Einheit? */
  inSession: boolean;
  breakdown: WBGTBreakdown;
}

interface CacheEntry {
  cachedAt: number;
  data: WeatherApiResponse;
}

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const HOURLY_PARAMS = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'direct_radiation',
  'diffuse_radiation',
] as const;

/** Cache-Lebensdauer: 60 Minuten */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Versionsnummer im Key: seit dem Tagesvergleich wird auch der Vortag geladen
 * (`past_days=1`). Alte Eintraege haben diese Stunden nicht und wuerden den
 * Vergleich leer lassen – die Version invalidiert sie schlagartig.
 */
const CACHE_PREFIX = 'wbgt_cache_v2_';

/** Untergrund-Offsets in °C (claude.md §3.1, erweitert um Tennis und Beachvolleyball) */
export const SURFACE_OFFSETS: Record<Surface, number> = {
  grass: 0.0,
  turf_black: 4.5,
  turf_light: 2.5,
  sand_clay: 1.5,
  clay_red: 1.5,
  hardcourt: 3.0,
  quartz_sand: 1.5,
};

/** Anteil von Direktstrahlung und Untergrund-Offset, der bei der Beschattung wirkt. */
export const SHADOW_FACTORS: Record<Shadow, number> = {
  none: 1.0,
  partial: 0.5,
  full: 0.0,
};

/**
 * Diffuse Himmelsstrahlung bleibt unter Bäumen weitgehend erhalten;
 * unter einem Dach/einer Tribüne kommt nur Restlicht an.
 */
export const SHADOW_DIFFUSE_FACTORS: Record<Shadow, number> = {
  none: 1.0,
  partial: 0.8,
  full: 0.25,
};

/** Kuehlung durch frische Bewaesserung – wirkt nur in der aktuellen Stunde (claude.md §3.3) */
export const WATERING_COOLING = 2.5;

/** Untere Grenzen der Ampelstufen nach FIFA/ACSM fuer den akklimatisierten Profibereich. */
export const ADULT_THRESHOLDS = {
  yellow: 25.0,
  orange: 27.8,
  red: 30.0,
} as const;

/**
 * Abzug von den FIFA/ACSM-Schwellen: negativ = Warnung greift früher.
 * Amateure sind seltener hitzeakklimatisiert und haben keine medizinische
 * Abteilung an der Seitenlinie – deshalb ein Breitensport-Puffer bei allen Klassen.
 */
export const AGE_OFFSETS: Record<AgeGroup, number> = {
  child: -1.5,
  youth: -0.8,
  adult: -1.0,
  senior: -1.2,
};

export function getAgeOffset(ageGroup: AgeGroup): number {
  return AGE_OFFSETS[ageGroup] ?? AGE_OFFSETS.adult;
}

/** Gewichte der WBGT-Formel im Freien: 0.7·Tw + 0.2·Tg + 0.1·Ta */
export const WBGT_WET_BULB_WEIGHT = 0.7;
export const WBGT_GLOBE_WEIGHT = 0.2;
export const WBGT_AIR_WEIGHT = 0.1;

/** Solarlast auf die Schwarzkugel: Direktstrahlung zaehlt staerker als diffus */
export const SOLAR_DIRECT_WEIGHT = 0.8;
export const SOLAR_DIFFUSE_WEIGHT = 0.4;

/** Tg-Zuschlag: 0.045 · Solar / (1 + Wind), gedeckelt */
export const GLOBE_SOLAR_COEF = 0.045;
export const GLOBE_DELTA_MAX = 20;

/**
 * Handlungsempfehlungen je Ereignistyp und Ampelstufe – kurze Stichpunkte
 * für die Ampel-Box. Hintergrund zu KSI/NATA, AAP und Penn State steht
 * im Quellen-Modul.
 */
const RECOMMENDATIONS: Record<
  EventType,
  Record<ColorCode, { title: string; points: string[] }>
> = {
  training: {
    green: {
      title: 'Training möglich',
      points: [
        'Trinkpausen wie gewohnt, Getränke frei zugänglich',
        'Vor, während und nach der Einheit trinken',
        'Kinder: unbeschränkten Trinkzugang sicherstellen',
      ],
    },
    yellow: {
      title: 'Intensität reduzieren',
      points: [
        'Keine Dauerläufe oder hochintensive Blöcke',
        'Trink- und Schattenpausen alle 15–20 Minuten',
        'Kinder: kürzere Belastungsintervalle',
      ],
    },
    orange: {
      title: 'Belastung deutlich drosseln',
      points: [
        'Kühlpausen alle 15–20 Minuten im Schatten',
        'Intensität stark reduzieren',
        'Kinder: kürzere Einheiten, mehr Pausen',
      ],
    },
    red: {
      title: 'Training verlegen oder absagen',
      points: [
        'Keine hochintensive Belastung',
        'In kühlere Stunden verlegen oder absagen',
        'Kinder und Jugendteams besonders schützen',
      ],
    },
  },
  match: {
    green: {
      title: 'Spielbetrieb möglich',
      points: [
        'Getränke am Spielfeldrand bereithalten',
        'Auch bei grüner Ampel regelmäßig trinken',
        'Jugendspiele: Trinken auch während des Spiels',
      ],
    },
    yellow: {
      title: 'Zusätzliche Trinkpausen einplanen',
      points: [
        'Pro Halbzeit mindestens eine Extra-Trinkpause',
        'Spielleitung vor Anpfiff informieren',
        'Ersatzbänke in den Schatten',
      ],
    },
    orange: {
      title: 'Kühlpausen im Spielplan verankern',
      points: [
        'Trink- und Kühlpausen verbindlich abstimmen',
        'Kühlung in der Halbzeit, Schatten für Auswechselnde',
        'Jugend: Spielzeit begrenzen, Wechsel nutzen',
      ],
    },
    red: {
      title: 'Spielverlegung prüfen',
      points: [
        'Anpfiff verschieben oder absagen',
        'Ohne Akklimatisierung Abbruch prüfen',
        'Jugendspiele besonders schützen',
      ],
    },
  },
  tournament: {
    green: {
      title: 'Turnierbetrieb möglich',
      points: [
        'Schatten und Getränke für wartende Teams',
        'Zwischen den Spielen hydrieren',
        'Kinder nicht in der prallen Sonne warten lassen',
      ],
    },
    yellow: {
      title: 'Schattenzonen und Trinkpausen fest einplanen',
      points: [
        'Trinkpausen in jedem Spiel verankern',
        'Wartezonen beschatten',
        'Jugendteams: Wartezeiten in der Sonne kurz halten',
      ],
    },
    orange: {
      title: 'Regeneration zwischen den Spielen strecken',
      points: [
        'Längere Pausen, Kühlung an allen Wartezonen',
        'Spielzahl am heißesten Teil des Tages reduzieren',
        'Jugend: weniger Spiele in der Hitze',
      ],
    },
    red: {
      title: 'Turnier unterbrechen oder verlegen',
      points: [
        'Spiele in kühlere Stunden legen',
        'Turnier unterbrechen oder verlegen',
        'Jugendturniere besonders streng schützen',
      ],
    },
  },
  other: {
    green: {
      title: 'Normaler Betrieb möglich',
      points: [
        'Trinkpausen einhalten, Schatten nutzen',
        'Vor, während und nach der Belastung trinken',
        'Kinder: unbeschränkten Trinkzugang',
      ],
    },
    yellow: {
      title: 'Belastung anpassen',
      points: [
        'Direkte Sonne meiden',
        'Trinkpausen mindestens alle 15–20 Minuten',
        'Kinder: kürzere Intervalle',
      ],
    },
    orange: {
      title: 'Kühlpausen einlegen',
      points: [
        'Intensität deutlich drosseln',
        'Schatten und Getränke sicherstellen',
        'Kinder und Jugendliche häufiger pausieren',
      ],
    },
    red: {
      title: 'Verlegung oder Absage prüfen',
      points: [
        'Keine längere Belastung in der prallen Sonne',
        'Verlegung oder Absage prüfen',
        'Kinder besonders schützen',
      ],
    },
  },
};

/** Kontextstunden, die vor und nach der Einheit mit angezeigt werden. */
export const CONTEXT_HOURS = 5;

/**
 * Nur realistische Trainingszeiten darstellen – nachts um 3 Uhr trainiert
 * niemand, und leere Balken würden das Diagramm nur stauchen.
 */
export const DISPLAY_HOUR_FROM = 6;
export const DISPLAY_HOUR_TO = 23;

/**
 * Obergrenze fuer die Balkenzahl: 5 Kontextstunden je Seite plus die
 * maximale Einheitsdauer von 6 Stunden.
 */
export const MAX_DISPLAY_HOURS = 16;

/** Open-Meteo liefert maximal 16 Tage Vorhersage. */
const MAX_FORECAST_DAYS = 16;

// ---------------------------------------------------------------------------
// Caching / Datenbeschaffung
// ---------------------------------------------------------------------------

/**
 * Lokaler Stundenstempel im Format von Open-Meteo ("2026-08-13T14:00").
 *
 * Akzeptiert direkt den Wert eines `datetime-local`-Inputs – der ist schon
 * lokale Zeit ohne Zeitzonen-Suffix und wird deshalb nur zugeschnitten statt
 * durch `Date` geschickt (das ihn je nach Browser als UTC deuten könnte).
 */
export function localHourStamp(when: Date | string = new Date()): string {
  if (typeof when === 'string') return `${when.slice(0, 13)}:00`;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(
    when.getHours()
  )}:00`;
}

/**
 * Verschiebt einen lokalen Zeitstempel um ganze Tage.
 *
 * Rechnet bewusst über die Kalender-Felder statt über "+24 Stunden": beim
 * Zeitumstellungs-Wochenende bliebe die Uhrzeit sonst nicht stehen, und der
 * Vergleich mit Vortag/Folgetag würde eine Stunde verrutschen.
 */
export function shiftStampByDays(stamp: string, days: number): string {
  const [datePart, timePart = '00:00'] = stamp.split('T');
  const [year, month, day] = datePart.split('-').map(Number);

  const shifted = new Date(year, month - 1, day + days);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(
    shifted.getDate()
  )}T${timePart.slice(0, 5)}`;
}

/** Stunde des Tages aus einem lokalen Zeitstempel ("2026-08-13T14:00" -> 14). */
export function hourOfStamp(stamp: string): number {
  return Number(stamp.slice(11, 13));
}

/**
 * Wie viele Vorhersagetage von Open-Meteo nötig sind, damit der gewählte
 * Startzeitpunkt plus die Folgestunden abgedeckt sind.
 */
export function forecastDaysFor(startTime?: Date | string): number {
  const fallback = 2;
  if (!startTime) return fallback;

  const target = typeof startTime === 'string' ? new Date(startTime) : startTime;
  if (Number.isNaN(target.getTime())) return fallback;

  const daysAhead = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  // +2 Tage Puffer: einer fuer den Folgetag-Vergleich, einer fuer Einheiten,
  // die spaet abends beginnen und deren Kontextstunden in den naechsten Tag laufen
  return Math.min(MAX_FORECAST_DAYS, Math.max(fallback, daysAhead + 2));
}

/**
 * Cache-Key. Koordinaten werden auf 4 Nachkommastellen (~11 m) gerundet, damit
 * minimal abweichende GPS-Werte nicht bei jedem Aufruf einen neuen Key erzeugen.
 *
 * Die Anzahl der Vorhersagetage gehört in den Key: sonst würde eine zuvor
 * gecachte 2-Tage-Antwort für eine Anfrage in 5 Tagen wiederverwendet und die
 * gesuchte Stunde fehlte in den Daten.
 */
export function buildCacheKey(lat: number, lng: number, forecastDays: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(4)}_${lng.toFixed(4)}_${forecastDays}d`;
}

function readCache(key: string): WeatherApiResponse | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.cachedAt || !entry.data?.hourly?.time) return null;

    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    // Defekter Eintrag oder localStorage nicht verfuegbar (z.B. Private Mode)
    return null;
  }
}

/**
 * Entfernt abgelaufene und unlesbare Cache-Eintraege.
 *
 * Notwendig, weil ein Ort je nach geplanter Vorlaufzeit mehrere Keys erzeugt
 * (2d, 5d, 7d …): ohne Aufraeumen bliebe jeder je gewaehlte Zeitraum fuer immer
 * im localStorage liegen, da die TTL-Pruefung nur beim erneuten Lesen greift.
 */
function pruneCache(): void {
  try {
    const now = Date.now();
    const stale: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;

      try {
        const entry = JSON.parse(window.localStorage.getItem(key) ?? '') as CacheEntry;
        if (!entry?.cachedAt || now - entry.cachedAt > CACHE_TTL_MS) stale.push(key);
      } catch {
        stale.push(key);
      }
    }

    stale.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage gesperrt – nicht kritisch
  }
}

function writeCache(key: string, data: WeatherApiResponse): void {
  if (typeof window === 'undefined') return;

  pruneCache();

  try {
    const entry: CacheEntry = { cachedAt: Date.now(), data };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Quota voll oder Storage gesperrt – Fetch-Ergebnis bleibt trotzdem nutzbar
  }
}

/**
 * Holt die stuendlichen Wetterdaten von Open-Meteo.
 *
 * @param forceRefresh true = Cache ignorieren, frisch laden und Cache ueberschreiben.
 * @param startTime    Gewuenschter Startzeitpunkt; bestimmt, wie weit die
 *                     Vorhersage reichen muss. Ohne Angabe: heute + morgen.
 */
export async function fetchWeatherData(
  lat: number,
  lng: number,
  forceRefresh = false,
  startTime?: Date | string
): Promise<WeatherApiResponse> {
  const forecastDays = forecastDaysFor(startTime);
  const cacheKey = buildCacheKey(lat, lng, forecastDays);

  if (!forceRefresh) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('hourly', HOURLY_PARAMS.join(','));
  url.searchParams.set('wind_speed_unit', 'ms'); // Berechnung erwartet m/s
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(forecastDays));
  // Gestern mitladen – sonst fehlt der Vortag im Vergleich, wenn die Einheit heute ist
  url.searchParams.set('past_days', '1');

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo Fehler: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as WeatherApiResponse;
  if (!data?.hourly?.time?.length) {
    throw new Error('Open-Meteo lieferte keine stündlichen Daten.');
  }

  writeCache(cacheKey, data);
  return data;
}

/**
 * Index der gesuchten Stunde in `hourly.time`. Open-Meteo liefert die Zeitstempel
 * in lokaler Zeit des Ortes ("2026-08-13T14:00"), daher wird auf String-Ebene
 * verglichen statt via Date-Parsing (das UTC annehmen wuerde).
 *
 * Ohne Argument wird die aktuelle Stunde gesucht.
 */
export function findHourIndex(
  apiData: WeatherApiResponse,
  when: Date | string = new Date()
): number {
  const stamp = localHourStamp(when);

  const exact = apiData.hourly.time.indexOf(stamp);
  if (exact !== -1) return exact;

  // Fallback: letzte Stunde, die nicht in der Zukunft liegt
  const idx = apiData.hourly.time.findIndex((t) => t > stamp);
  if (idx === -1) return Math.max(0, apiData.hourly.time.length - 1);
  return Math.max(0, idx - 1);
}

/**
 * Wie {@link findHourIndex}, liefert aber -1 statt eines Naeherungswerts, wenn
 * die Stunde nicht in den Daten liegt. Fuer den Tagesvergleich noetig: dort
 * darf kein falscher Tag herangezogen werden, wenn Vortag oder Folgetag fehlen.
 */
export function findExactHourIndex(
  apiData: WeatherApiResponse,
  when: Date | string
): number {
  return apiData.hourly.time.indexOf(localHourStamp(when));
}

// ---------------------------------------------------------------------------
// WBGT-Naeherung
// ---------------------------------------------------------------------------

/**
 * Feuchtkugeltemperatur nach Stull (2011) – Naeherung fuer Normaldruck.
 */
function wetBulbTemperature(tempC: number, relHumidity: number): number {
  const rh = Math.min(100, Math.max(1, relHumidity));

  return (
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

function solarLoad(directRadiation: number, diffuseRadiation: number): number {
  return (
    SOLAR_DIRECT_WEIGHT * Math.max(0, directRadiation ?? 0) +
    SOLAR_DIFFUSE_WEIGHT * Math.max(0, diffuseRadiation ?? 0)
  );
}

/**
 * Naeherung der Schwarzkugeltemperatur: Strahlung heizt die Kugel auf, Wind kuehlt sie.
 * Der Zuschlag ist auf {@link GLOBE_DELTA_MAX} K begrenzt (Plausibilitaetsgrenze bei Windstille).
 */
function globeFromSolar(
  tempC: number,
  solarWm2: number,
  windMs: number
): { delta: number; capped: boolean; globe: number } {
  const wind = Math.max(0, windMs);
  const raw = (GLOBE_SOLAR_COEF * Math.max(0, solarWm2)) / (1 + wind);
  const capped = raw > GLOBE_DELTA_MAX;
  const delta = Math.min(raw, GLOBE_DELTA_MAX);
  return { delta, capped, globe: tempC + delta };
}

/**
 * Approximierter Basis-WBGT im Freien:
 *   WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
 */
export function approximateWBGT(
  tempC: number,
  relHumidity: number,
  windMs: number,
  directRadiation: number,
  diffuseRadiation: number
): number {
  const tw = wetBulbTemperature(tempC, relHumidity);
  const solar = solarLoad(directRadiation, diffuseRadiation);
  const { globe } = globeFromSolar(tempC, solar, windMs);

  return WBGT_WET_BULB_WEIGHT * tw + WBGT_GLOBE_WEIGHT * globe + WBGT_AIR_WEIGHT * tempC;
}

export function getAmpelThresholds(ageGroup: AgeGroup): {
  yellow: number;
  orange: number;
  red: number;
} {
  const offset = getAgeOffset(ageGroup);
  return {
    yellow: ADULT_THRESHOLDS.yellow + offset,
    orange: ADULT_THRESHOLDS.orange + offset,
    red: ADULT_THRESHOLDS.red + offset,
  };
}

// ---------------------------------------------------------------------------
// Ampelsystem
// ---------------------------------------------------------------------------

/**
 * Ampelstufe fuer einen WBGT-Wert. FIFA/ACSM-Schwellen plus {@link AGE_OFFSETS}
 * (Breitensport-Puffer und Altersklasse).
 */
export function getColorCode(wbgtValue: number, ageGroup: AgeGroup): ColorCode {
  const { yellow, orange, red } = getAmpelThresholds(ageGroup);

  if (wbgtValue > red) return 'red';
  if (wbgtValue >= orange) return 'orange';
  if (wbgtValue >= yellow) return 'yellow';
  return 'green';
}

export function getRecommendation(
  colorCode: ColorCode,
  eventType: EventType = 'training'
): { title: string; points: string[] } {
  return RECOMMENDATIONS[eventType][colorCode];
}

export function getRecommendationLabel(
  colorCode: ColorCode,
  eventType: EventType = 'training'
): string {
  return getRecommendation(colorCode, eventType).title;
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

export interface ForecastRequest {
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  ageGroup: AgeGroup;
  /** Art der Belastung – steuert die Handlungsempfehlung, nicht den WBGT-Wert */
  eventType?: EventType;
  /** Erste Stunde der Einheit (Index in `apiData.hourly.*`) */
  sessionFromIndex: number;
  /** Letzte Stunde der Einheit, einschliesslich */
  sessionToIndex: number;
  /** Kontextstunden vor/nach der Einheit; Standard {@link CONTEXT_HOURS} */
  contextHours?: number;
  /**
   * Stunden ausserhalb dieses Fensters werden nicht dargestellt. Standard ist
   * {@link DISPLAY_HOUR_FROM} bis {@link DISPLAY_HOUR_TO}; die Stunden der
   * Einheit selbst bleiben immer erhalten, auch wenn sie ausserhalb liegen.
   */
  displayHourFrom?: number;
  displayHourTo?: number;
}

/**
 * Berechnet die WBGT-Werte fuer die Einheit plus einige Kontextstunden davor
 * und danach.
 *
 * Die Bewaesserung wirkt auf die erste Stunde der EINHEIT – nicht auf die erste
 * angezeigte Stunde: gewaessert wird direkt vor dem Anpfiff, nicht zwei Stunden
 * vorher.
 */
export function calculateWBGTForecast(
  apiData: WeatherApiResponse,
  request: ForecastRequest
): WBGTHour[] {
  const hourly = apiData?.hourly;
  if (!hourly?.time?.length) {
    throw new Error('Ungültige API-Daten: keine stündlichen Werte vorhanden.');
  }

  const {
    surface,
    shadow,
    watered,
    ageGroup,
    eventType = 'training',
    contextHours = CONTEXT_HOURS,
    displayHourFrom = DISPLAY_HOUR_FROM,
    displayHourTo = DISPLAY_HOUR_TO,
  } = request;

  const lastIndex = hourly.time.length - 1;
  const clamp = (i: number) => Math.max(0, Math.min(i, lastIndex));

  const sessionFrom = clamp(request.sessionFromIndex);
  const sessionTo = clamp(Math.max(request.sessionToIndex, request.sessionFromIndex));

  const surfaceOffset = SURFACE_OFFSETS[surface] ?? 0;
  const shadowFactor = SHADOW_FACTORS[shadow] ?? 1;
  const diffuseFactor = SHADOW_DIFFUSE_FACTORS[shadow] ?? 1;
  // Auf 0.1 °C gerundet, damit die Aufschlüsselung im Dashboard exakt aufgeht
  // (Halbschatten auf +4.5 ergäbe sonst 2.25). Physikalisch irrelevant.
  const effectiveSurfaceOffset = round1(surfaceOffset * shadowFactor);
  const shadowAdjustment = round1(effectiveSurfaceOffset - surfaceOffset);

  const forecast: WBGTHour[] = [];

  for (let i = clamp(sessionFrom - contextHours); i <= clamp(sessionTo + contextHours); i++) {
    const timestamp = hourly.time[i];
    const inSession = i >= sessionFrom && i <= sessionTo;

    // Kontextstunden ausserhalb der Trainingszeiten weglassen – die Einheit
    // selbst wird nie unterdrueckt, sonst stuende vor Ort ein leeres
    // Diagramm, nur weil die Einheit frueh morgens liegt.
    if (!inSession) {
      const hour = hourOfStamp(timestamp);
      if (hour < displayHourFrom || hour > displayHourTo) continue;
    }

    const temp = hourly.temperature_2m[i];
    const humidity = hourly.relative_humidity_2m[i];
    const wind = hourly.wind_speed_10m[i];
    const direct = hourly.direct_radiation[i];
    const diffuse = hourly.diffuse_radiation[i];

    const effectiveDirect = direct * shadowFactor;
    const effectiveDiffuse = diffuse * diffuseFactor;

    const wetBulb = wetBulbTemperature(temp, humidity);
    const solarUnshaded = solarLoad(direct, diffuse);
    const solarShaded = solarLoad(effectiveDirect, effectiveDiffuse);
    const unshadedGlobe = globeFromSolar(temp, solarUnshaded, wind);
    const shadedGlobe = globeFromSolar(temp, solarShaded, wind);

    const unshaded =
      WBGT_WET_BULB_WEIGHT * wetBulb +
      WBGT_GLOBE_WEIGHT * unshadedGlobe.globe +
      WBGT_AIR_WEIGHT * temp;
    const shaded =
      WBGT_WET_BULB_WEIGHT * wetBulb +
      WBGT_GLOBE_WEIGHT * shadedGlobe.globe +
      WBGT_AIR_WEIGHT * temp;

    // Bewaesserung kuehlt ausschliesslich die erste Stunde der Einheit
    const wateringOffset = watered && i === sessionFrom ? -WATERING_COOLING : 0;

    // Basis auf eine Nachkommastelle runden, bevor die Offsets addiert werden –
    // so ergibt die Aufschluesselung im Dashboard exakt den finalen Wert.
    const baseWbgt = round1(unshaded);
    const shadedWbgt = round1(shaded);
    const shadeRadiationAdjustment = shadedWbgt - baseWbgt;
    const wbgtValue = round1(
      baseWbgt + shadeRadiationAdjustment + effectiveSurfaceOffset + wateringOffset
    );
    const colorCode = getColorCode(wbgtValue, ageGroup);
    const recommendation = getRecommendation(colorCode, eventType);

    forecast.push({
      timestamp,
      wbgtValue,
      colorCode,
      recommendationLabel: recommendation.title,
      recommendationPoints: recommendation.points,
      inSession,
      breakdown: {
        temperature: temp,
        humidity,
        wind,
        directRadiation: direct,
        diffuseRadiation: diffuse,
        shadowFactor,
        diffuseFactor,
        effectiveDirect,
        effectiveDiffuse,
        wetBulb,
        solarUnshaded,
        solarShaded,
        globeDeltaUnshaded: unshadedGlobe.delta,
        globeDeltaShaded: shadedGlobe.delta,
        globeDeltaCapped: shadedGlobe.capped,
        globeUnshaded: unshadedGlobe.globe,
        globeShaded: shadedGlobe.globe,
        baseWbgt,
        shadedWbgt,
        shadeRadiationAdjustment,
        surfaceOffset,
        effectiveSurfaceOffset,
        shadowAdjustment,
        wateringOffset,
        watered,
      },
    });
  }

  return trimToMaxHours(forecast);
}

/**
 * Kuerzt zu lange Reihen auf {@link MAX_DISPLAY_HOURS}, indem zuerst die
 * Kontextstunden am Rand entfallen. Die Einheit selbst bleibt vollstaendig.
 */
function trimToMaxHours(forecast: WBGTHour[]): WBGTHour[] {
  const trimmed = [...forecast];

  while (trimmed.length > MAX_DISPLAY_HOURS) {
    if (!trimmed[trimmed.length - 1].inSession) trimmed.pop();
    else if (!trimmed[0].inSession) trimmed.shift();
    else break; // nur noch Einheit uebrig – die wird nicht beschnitten
  }

  return trimmed;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Gesamtbewertung des Zeitraums: die Ampel richtet sich nach dem hoechsten
 * WBGT-Wert der Prognose (claude.md §4).
 */
export function getForecastSummary(forecast: WBGTHour[]): {
  maxWbgt: number;
  colorCode: ColorCode;
  recommendationLabel: string;
  recommendationPoints: string[];
} | null {
  if (!forecast.length) return null;

  const peak = forecast.reduce((a, b) => (b.wbgtValue > a.wbgtValue ? b : a));

  return {
    maxWbgt: peak.wbgtValue,
    colorCode: peak.colorCode,
    recommendationLabel: peak.recommendationLabel,
    recommendationPoints: peak.recommendationPoints,
  };
}

// ---------------------------------------------------------------------------
// Zeitraum der Einheit
// ---------------------------------------------------------------------------

/**
 * Erste und letzte volle Stunde, die eine Einheit beruehrt.
 *
 * Ein Ende um 17:00 zaehlt die Stunde 17 NICHT mit – zu dem Zeitpunkt ist die
 * Einheit vorbei. Deshalb wird eine Minute abgezogen, bevor gerundet wird.
 */
export function sessionHourStamps(
  startTime: string,
  endTime: string
): { from: string; to: string } {
  const from = localHourStamp(startTime);

  const end = new Date(endTime);
  if (Number.isNaN(end.getTime())) return { from, to: from };

  const to = localHourStamp(new Date(end.getTime() - 60_000));
  return { from, to: to < from ? from : to };
}

export interface SessionParams {
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  ageGroup: AgeGroup;
  eventType?: EventType;
  startTime: string;
  endTime: string;
}

/**
 * Spitzenwert waehrend der Einheit – ohne Kontextstunden.
 *
 * Liefert null, wenn der Zeitraum nicht vollstaendig in den Daten liegt (z.B.
 * beim Vortag-Vergleich am Rand des Vorhersagefensters). Bewusst kein
 * Naeherungswert: ein stillschweigend falscher Tag waere schlimmer als ein
 * fehlender Vergleich.
 */
export function summarizeSession(
  apiData: WeatherApiResponse,
  params: SessionParams
): { maxWbgt: number; colorCode: ColorCode; recommendationLabel: string } | null {
  const { from, to } = sessionHourStamps(params.startTime, params.endTime);

  const sessionFromIndex = findExactHourIndex(apiData, from);
  const sessionToIndex = findExactHourIndex(apiData, to);
  if (sessionFromIndex === -1 || sessionToIndex === -1) return null;

  const hours = calculateWBGTForecast(apiData, {
    surface: params.surface,
    shadow: params.shadow,
    watered: params.watered,
    ageGroup: params.ageGroup,
    eventType: params.eventType,
    sessionFromIndex,
    sessionToIndex,
    contextHours: 0,
  });

  return getForecastSummary(hours);
}
