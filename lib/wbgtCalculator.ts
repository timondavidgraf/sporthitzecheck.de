import {
  appliedBounds,
  DEFAULT_INTENSITY,
  hasNumericSurfaceOffset,
  numericSurfaceOffset,
  sportAllowsWatering,
  type IntensityLevel,
  type Sport,
} from './sportsConfig';
import { getDisplayRecommendation } from './recommendations';
import type { SourceId } from './sourcesRegistry';

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
  | 'quartz_sand'
  | 'asphalt'
  | 'gravel'
  | 'tartan'
  | 'hockey_water'
  | 'turf_sand'
  | 'turf_epdm'
  | 'clay_red_dry';
export type Shadow = 'none' | 'partial' | 'full';
export type AgeBand = "youth" | "adult" | "senior";
export type PerformanceLevel = "recreational" | "elite";
/** @deprecated Nutze AgeBand; bleibt als Alias für alte Imports. */
export type AgeGroup = AgeBand;
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
  /** Open-Meteo: Wind in m/s, gemessen auf 10 m */
  wind: number;
  /** Wind auf 2 m Höhe (FAO-56) – die Höhe, für die WBGT-Modelle kalibriert sind */
  wind2m: number;
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

  /** Psychrometrische Feuchtkugel Tw nach Stull (beschattet, belüftet) */
  wetBulb: number;
  /** Globalstrahlung (direkt + diffus) ohne Beschattung */
  globalUnshaded: number;
  /** Globalstrahlung nach Beschattung */
  globalShaded: number;
  /** Natürliche Feuchtkugel Tnw ohne Beschattung – der 70-%-Anteil der Formel */
  naturalWetBulbUnshaded: number;
  /** Natürliche Feuchtkugel Tnw nach Beschattung */
  naturalWetBulbShaded: number;
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
  /** false, wenn der Untergrund nur einen qualitativen Warnhinweis hat */
  surfaceOffsetApplied: boolean;
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
  recommendationQuelleId: SourceId;
  officialDecisionNote?: string;
  hauptempfehlung: string;
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

/**
 * Kuehlung durch frische Bewaesserung – bewusst klein gehalten.
 *
 * Fuer den WBGT-Effekt einer bewaesserten Sportflaeche existiert keine Studie.
 * Die einzige quantifizierte Evidenz stammt aus flaechiger Feldbewaesserung
 * (Commun Earth Environ 2024): −0,3 bis −1,3 K am Tag, aber +0,4 bis +1,3 K
 * nachts, weil die zusaetzliche Feuchte die Feuchtkugel anhebt. Ein einzelner
 * gewaesserter Platz liegt weit darunter.
 *
 * Deshalb: hoechstens 0,5 K, nur tagsueber und nur bei trockener Luft. Ein
 * groesserer Bonus wuerde die Ampel entschaerfen, ohne dass es dafuer eine
 * Grundlage gibt – der gefaehrlichste Fehler, den diese App machen koennte.
 */
export const WATERING_COOLING = 0.5;

/** Ab dieser Feuchte hebt die Verdunstung die Feuchtkugel mehr an als sie kuehlt. */
export const WATERING_MAX_HUMIDITY = 70;

/** Gewichte der WBGT-Formel im Freien nach ISO 7243: 0.7·Tnw + 0.2·Tg + 0.1·Ta */
export const WBGT_WET_BULB_WEIGHT = 0.7;
export const WBGT_GLOBE_WEIGHT = 0.2;
export const WBGT_AIR_WEIGHT = 0.1;

/**
 * Open-Meteo liefert Wind auf 10 m, WBGT-Modelle rechnen mit 2 m.
 * Umrechnung nach FAO-56 (Allen et al. 1998): u2 = uz · 4.87 / ln(67.8·z − 5.42).
 *
 * Ohne diesen Schritt wird die Konvektionskühlung überschätzt und der WBGT
 * systematisch zu niedrig geschätzt (Clark & Konrad 2020: kalte Verzerrung von
 * 4–6 °F in den NWS-WBGT-Vorhersagen, u. a. aus genau diesem Grund).
 */
export const WIND_10M_TO_2M = 4.87 / Math.log(67.8 * 10 - 5.42);

/**
 * Aufschlag von der psychrometrischen auf die natürliche Feuchtkugel nach
 * Hunter & Minyard (1999), wie vom US National Weather Service für die
 * operationelle WBGT-Vorhersage genutzt:
 *   Tnw = Tw + 0.00117·S − 0.233·u2 + 1.072
 *
 * Notwendig, weil die WBGT-Formel die *natürliche* Feuchtkugel verlangt: ein
 * unbeschirmter, nur natürlich belüfteter Docht. Die psychrometrische
 * Feuchtkugel (Stull) steht im Schatten und wird belüftet – sie direkt
 * einzusetzen unterschätzt den WBGT bei Sonne und wenig Wind deutlich.
 */
export const NWB_SOLAR_COEF = 0.00117;
export const NWB_WIND_COEF = 0.233;
export const NWB_CONST = 1.072;

/** Solarlast auf die Schwarzkugel: Direktstrahlung zaehlt staerker als diffus */
export const SOLAR_DIRECT_WEIGHT = 0.8;
export const SOLAR_DIFFUSE_WEIGHT = 0.4;

/** Tg-Zuschlag: 0.045 · Solar / (1 + Wind), gedeckelt */
export const GLOBE_SOLAR_COEF = 0.045;
export const GLOBE_DELTA_MAX = 20;

/** Kontextstunden, die vor und nach der Einheit mit angezeigt werden. */
export const CONTEXT_HOURS = 5;

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
 * Psychrometrische Feuchtkugeltemperatur nach Stull (2011) – empirischer Fit
 * fuer Normaldruck, gueltig fuer 5–99 % rF und −20 bis +50 °C
 * (mittlerer absoluter Fehler < 0,3 K).
 */
function wetBulbTemperature(tempC: number, relHumidity: number): number {
  const rh = Math.min(99, Math.max(5, relHumidity));

  return (
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** Wind von 10 m auf 2 m Hoehe (FAO-56). */
export function windAt2m(wind10m: number): number {
  return Math.max(0, wind10m) * WIND_10M_TO_2M;
}

/**
 * Natuerliche Feuchtkugel Tnw aus der psychrometrischen Feuchtkugel,
 * der Globalstrahlung und dem 2-m-Wind (Hunter & Minyard 1999).
 *
 * Der Wert wird nie unter Tw gedrueckt: bei viel Wind naehern sich beide an,
 * eine Unterschreitung waere physikalisch nicht plausibel.
 */
function naturalWetBulbTemperature(
  wetBulb: number,
  globalRadiation: number,
  wind2m: number
): number {
  const adjusted =
    wetBulb +
    NWB_SOLAR_COEF * Math.max(0, globalRadiation) -
    NWB_WIND_COEF * Math.max(0, wind2m) +
    NWB_CONST;

  return Math.max(wetBulb, adjusted);
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
 *   WBGT = 0.7 * Tnw + 0.2 * Tg + 0.1 * Ta
 *
 * `windMs` ist der Wind auf 10 m, wie Open-Meteo ihn liefert.
 */
export function approximateWBGT(
  tempC: number,
  relHumidity: number,
  windMs: number,
  directRadiation: number,
  diffuseRadiation: number
): number {
  const wind2m = windAt2m(windMs);
  const tw = wetBulbTemperature(tempC, relHumidity);
  const global = Math.max(0, directRadiation ?? 0) + Math.max(0, diffuseRadiation ?? 0);
  const tnw = naturalWetBulbTemperature(tw, global, wind2m);
  const solar = solarLoad(directRadiation, diffuseRadiation);
  const { globe } = globeFromSolar(tempC, solar, wind2m);

  return WBGT_WET_BULB_WEIGHT * tnw + WBGT_GLOBE_WEIGHT * globe + WBGT_AIR_WEIGHT * tempC;
}

export function getAmpelThresholds(
  sport: Sport,
  ageGroup: AgeBand,
  intensity: IntensityLevel = DEFAULT_INTENSITY,
  performanceLevel: PerformanceLevel = "recreational"
) {
  return appliedBounds(sport, ageGroup, intensity, performanceLevel);
}

/**
 * Ampelstufe fuer einen WBGT-Wert. Grenzen inklusive der jeweiligen *_max-Werte
 * (Grün ≤ gruen_max, danach Gelb ≤ gelb_max, Orange ≤ orange_max, sonst Rot).
 */
export function getColorCode(
  wbgtValue: number,
  sport: Sport,
  ageGroup: AgeBand,
  intensity: IntensityLevel = DEFAULT_INTENSITY,
  performanceLevel: PerformanceLevel = "recreational"
): ColorCode {
  const { gruen_max, gelb_max, orange_max } = getAmpelThresholds(
    sport,
    ageGroup,
    intensity,
    performanceLevel
  );

  if (wbgtValue > orange_max) return 'red';
  if (wbgtValue > gelb_max) return 'orange';
  if (wbgtValue > gruen_max) return 'yellow';
  return 'green';
}

export function getRecommendation(
  sport: Sport,
  colorCode: ColorCode,
  eventType: EventType = 'training',
  wbgtValue = 0,
  isDaytime = true
) {
  return getDisplayRecommendation(sport, colorCode, eventType, wbgtValue, isDaytime);
}

export function getRecommendationLabel(
  sport: Sport,
  colorCode: ColorCode,
  eventType: EventType = 'training',
  wbgtValue = 0
): string {
  return getRecommendation(sport, colorCode, eventType, wbgtValue).headline;
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

export interface ForecastRequest {
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  ageGroup: AgeBand;
  /** Nur bei Erwachsenen wirksam; Jugend und 65+ gelten als Breitensport. */
  performanceLevel?: PerformanceLevel;
  sport: Sport;
  /** Art der Belastung – steuert die Handlungsempfehlung, nicht den WBGT-Wert */
  eventType?: EventType;
  /** Wirkt auf Ampel-Schwellen, nicht auf den WBGT-Wert */
  intensity?: IntensityLevel;
  /** Erste Stunde der Einheit (Index in `apiData.hourly.*`) */
  sessionFromIndex: number;
  /** Letzte Stunde der Einheit, einschliesslich */
  sessionToIndex: number;
  /** Kontextstunden vor/nach der Einheit; Standard {@link CONTEXT_HOURS} */
  contextHours?: number;
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
    sport,
    eventType = 'training',
    intensity = DEFAULT_INTENSITY,
    performanceLevel = 'recreational',
    contextHours = CONTEXT_HOURS,
  } = request;

  const lastIndex = hourly.time.length - 1;
  const clamp = (i: number) => Math.max(0, Math.min(i, lastIndex));

  const sessionFrom = clamp(request.sessionFromIndex);
  const sessionTo = clamp(Math.max(request.sessionToIndex, request.sessionFromIndex));

  const surfaceOffsetApplied = hasNumericSurfaceOffset(sport, surface);
  const surfaceOffset = numericSurfaceOffset(sport, surface);
  const shadowFactor = SHADOW_FACTORS[shadow] ?? 1;
  const diffuseFactor = SHADOW_DIFFUSE_FACTORS[shadow] ?? 1;
  // Beschattung multipliziert nur belegte Zahlen-Offsets. Reine Warnhinweise
  // (wbgtOffset = null) bleiben numerisch 0. Auf 0.1 °C gerundet, damit die
  // Aufschlüsselung im Dashboard exakt aufgeht.
  const effectiveSurfaceOffset = surfaceOffsetApplied
    ? round1(surfaceOffset * shadowFactor)
    : 0;
  const shadowAdjustment = round1(effectiveSurfaceOffset - surfaceOffset);

  const forecast: WBGTHour[] = [];

  for (let i = clamp(sessionFrom - contextHours); i <= clamp(sessionTo + contextHours); i++) {
    const timestamp = hourly.time[i];
    const inSession = i >= sessionFrom && i <= sessionTo;

    const temp = hourly.temperature_2m[i];
    const humidity = hourly.relative_humidity_2m[i];
    const wind = hourly.wind_speed_10m[i];
    const direct = hourly.direct_radiation[i];
    const diffuse = hourly.diffuse_radiation[i];

    const effectiveDirect = direct * shadowFactor;
    const effectiveDiffuse = diffuse * diffuseFactor;
    const wind2m = windAt2m(wind);

    const wetBulb = wetBulbTemperature(temp, humidity);
    const globalUnshaded = Math.max(0, direct ?? 0) + Math.max(0, diffuse ?? 0);
    const globalShaded = Math.max(0, effectiveDirect) + Math.max(0, effectiveDiffuse);
    const naturalWetBulbUnshaded = naturalWetBulbTemperature(
      wetBulb,
      globalUnshaded,
      wind2m
    );
    const naturalWetBulbShaded = naturalWetBulbTemperature(wetBulb, globalShaded, wind2m);
    const solarUnshaded = solarLoad(direct, diffuse);
    const solarShaded = solarLoad(effectiveDirect, effectiveDiffuse);
    const unshadedGlobe = globeFromSolar(temp, solarUnshaded, wind2m);
    const shadedGlobe = globeFromSolar(temp, solarShaded, wind2m);

    const unshaded =
      WBGT_WET_BULB_WEIGHT * naturalWetBulbUnshaded +
      WBGT_GLOBE_WEIGHT * unshadedGlobe.globe +
      WBGT_AIR_WEIGHT * temp;
    const shaded =
      WBGT_WET_BULB_WEIGHT * naturalWetBulbShaded +
      WBGT_GLOBE_WEIGHT * shadedGlobe.globe +
      WBGT_AIR_WEIGHT * temp;

    // Bewaesserung kuehlt ausschliesslich die erste Stunde der Einheit – und nur,
    // solange Sonne da ist und die Luft die Verdunstung noch aufnehmen kann.
    const wateringEffective =
      sportAllowsWatering(sport) &&
      watered &&
      i === sessionFrom &&
      globalUnshaded > 0 &&
      humidity < WATERING_MAX_HUMIDITY;
    const wateringOffset = wateringEffective ? -WATERING_COOLING : 0;

    // Basis auf eine Nachkommastelle runden, bevor die Offsets addiert werden –
    // so ergibt die Aufschluesselung im Dashboard exakt den finalen Wert.
    const baseWbgt = round1(unshaded);
    const shadedWbgt = round1(shaded);
    const shadeRadiationAdjustment = shadedWbgt - baseWbgt;
    const wbgtValue = round1(
      baseWbgt + shadeRadiationAdjustment + effectiveSurfaceOffset + wateringOffset
    );
    const colorCode = getColorCode(wbgtValue, sport, ageGroup, intensity, performanceLevel);
    const isDaytime = globalUnshaded > 0;
    const recommendation = getRecommendation(
      sport,
      colorCode,
      eventType,
      wbgtValue,
      isDaytime
    );

    forecast.push({
      timestamp,
      wbgtValue,
      colorCode,
      recommendationLabel: recommendation.headline,
      recommendationPoints: recommendation.stichpunkte,
      hauptempfehlung: recommendation.hauptempfehlung,
      recommendationQuelleId: recommendation.quelle_id,
      officialDecisionNote: recommendation.officialDecisionNote,
      inSession,
      breakdown: {
        temperature: temp,
        humidity,
        wind,
        wind2m,
        directRadiation: direct,
        diffuseRadiation: diffuse,
        shadowFactor,
        diffuseFactor,
        effectiveDirect,
        effectiveDiffuse,
        wetBulb,
        globalUnshaded,
        globalShaded,
        naturalWetBulbUnshaded,
        naturalWetBulbShaded,
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
        surfaceOffsetApplied,
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
 * WBGT-Wert der Prognose.
 */
export function getForecastSummary(forecast: WBGTHour[]): {
  maxWbgt: number;
  colorCode: ColorCode;
  recommendationLabel: string;
  recommendationPoints: string[];
  hauptempfehlung: string;
  recommendationQuelleId: SourceId;
  officialDecisionNote?: string;
} | null {
  if (!forecast.length) return null;

  const peak = forecast.reduce((a, b) => (b.wbgtValue > a.wbgtValue ? b : a));

  return {
    maxWbgt: peak.wbgtValue,
    colorCode: peak.colorCode,
    recommendationLabel: peak.recommendationLabel,
    recommendationPoints: peak.recommendationPoints,
    hauptempfehlung: peak.hauptempfehlung,
    recommendationQuelleId: peak.recommendationQuelleId,
    officialDecisionNote: peak.officialDecisionNote,
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
  ageGroup: AgeBand;
  performanceLevel?: PerformanceLevel;
  sport: Sport;
  eventType?: EventType;
  intensity?: IntensityLevel;
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
    performanceLevel: params.performanceLevel,
    sport: params.sport,
    eventType: params.eventType,
    intensity: params.intensity,
    sessionFromIndex,
    sessionToIndex,
    contextHours: 0,
  });

  return getForecastSummary(hours);
}
