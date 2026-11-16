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
  | 'clay_red_dry';
export type Shadow = 'none' | 'partial' | 'full';
export type AgeBand = "youth" | "adult" | "senior";
export type PerformanceLevel = "recreational" | "elite";
/**
 * Art der Einheit für die Handlungsempfehlung. `mixed` steht für
 * „Intensives Training / Freundschaftsspiel“: weder reines Training noch
 * Pflichtspiel, deshalb neutral als „Einheit“ formuliert.
 */
export type EventType = 'training' | 'match' | 'mixed';
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
    direct_radiation_instant: number[];
    diffuse_radiation_instant: number[];
    /** Direktstrahlung senkrecht zur Sonne; fehlt in älteren Cache-Einträgen */
    direct_normal_irradiance_instant?: (number | null)[];
    /** UV-Index; im Archiv nicht für jeden Zeitraum vorhanden */
    uv_index?: (number | null)[];
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
  /** Open-Meteo: Direktstrahlung auf die waagerechte Fläche in W/m² */
  directRadiation: number;
  /** Open-Meteo: Direktstrahlung senkrecht zur Sonne (DNI) in W/m²; null = nicht geliefert */
  directNormal: number | null;
  /** Direktanteil, mit dem die Schwarzkugel rechnet (DNI × sin 60°, sonst Gdir) */
  globeDirect: number;
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
  /** 0.8·Direktanteil der Kugel + 0.4·Gdif ohne Beschattung */
  solarUnshaded: number;
  /** dieselbe Solarlast mit beschatteter Strahlung */
  solarShaded: number;
  /** Tg − Ta ohne Beschattung (nach der 20-K-Kappe) */
  globeDeltaUnshaded: number;
  /** Tg − Ta mit Beschattung (nach der 20-K-Kappe) */
  globeDeltaShaded: number;
  /** true, wenn der Tg-Zuschlag mit Beschattung auf 20 K begrenzt wurde */
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
  /** UV-Index der Stunde; null, wenn Open-Meteo keinen liefert */
  uvIndex: number | null;
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

/**
 * Archiv der Vorhersagemodelle fuer den Rueckblick. Gleiche Parameter und
 * gleiches Antwortformat wie die Vorhersage-API, nur ein anderer Host und ein
 * festes Datumsfenster statt `forecast_days`.
 *
 * Bewusst nicht `past_days` der Vorhersage-API: die reicht zwar 92 Tage
 * zurueck, lieferte im Test (16.11.2026) aber fuer die aeltesten rund 25 Tage
 * nur Leerwerte.
 */
const OPEN_METEO_REVIEW_URL = 'https://historical-forecast-api.open-meteo.com/v1/forecast';

/**
 * Fruehester Tag fuer den Rueckblick. Open-Meteo archiviert die Modelle ab
 * 2022; das hochaufgeloeste ICON-D2 (ca. 2 km) erst ab dem 24.11.2022 – davor
 * stammen die Werte aus groeberen Modellen.
 */
export const EARLIEST_REVIEW_DATE = '2022-01-01';

/**
 * Strahlung als Momentanwert (`*_instant`): Die Standardfelder von Open-Meteo
 * sind Mittelwerte der VORANGEHENDEN Stunde und hinken der Temperatur damit
 * eine halbe Stunde hinterher – vormittags zu wenig, nachmittags zu viel Sonne.
 */
const HOURLY_PARAMS = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'direct_radiation_instant',
  'diffuse_radiation_instant',
  'direct_normal_irradiance_instant',
  'uv_index',
] as const;

/** Cache-Lebensdauer: 60 Minuten */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Versionsnummer im Key: aendert sich die Form der Antwort (v2: Vortag per
 * `past_days=1`, v3: Strahlung als Momentanwert, v4: DNI und UV-Index), passen
 * alte Eintraege nicht mehr – die Version invalidiert sie schlagartig.
 */
const CACHE_PREFIX = 'wbgt_cache_v4_';

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
 * Aufschlag von der psychrometrischen auf die natürliche Feuchtkugel, wie ihn
 * der US National Weather Service in der operationellen WBGT-Vorhersage (NDFD)
 * nutzt (Boyer, NOAA MDL; Kalibrierung nach Thomas 2020):
 *   Tnw = Tw + 0.001651·S − 0.09555·u2 + 0.13235·(Ta − Tw) + 0.20249
 *
 * Die ältere Regression von Hunter & Minyard (1999) lag laut NWS gegenüber
 * Messungen deutlich zu niedrig und wurde deshalb ersetzt; die neue Fassung
 * berücksichtigt zusätzlich die Feuchtkugeldifferenz Ta − Tw.
 *
 * Notwendig, weil die WBGT-Formel die *natürliche* Feuchtkugel verlangt: ein
 * unbeschirmter, nur natürlich belüfteter Docht. Die psychrometrische
 * Feuchtkugel (Stull) steht im Schatten und wird belüftet – sie direkt
 * einzusetzen unterschätzt den WBGT bei Sonne und wenig Wind deutlich.
 */
export const NWB_SOLAR_COEF = 0.001651;
export const NWB_WIND_COEF = 0.09555;
export const NWB_DEPRESSION_COEF = 0.13235;
export const NWB_CONST = 0.20249;

/** Solarlast auf die Schwarzkugel: Direktstrahlung zaehlt staerker als diffus */
export const SOLAR_DIRECT_WEIGHT = 0.8;
export const SOLAR_DIFFUSE_WEIGHT = 0.4;

/**
 * Sonnenhoehe, auf die der Direktanteil der Schwarzkugel normiert ist.
 *
 * Eine Kugel faengt die Sonne unabhaengig vom Sonnenstand ein; die
 * Direktstrahlung auf die waagerechte Flaeche (Gdir) schrumpft dagegen mit
 * tiefer Sonne. Frueher rechnete die Kugel mit Gdir und lag morgens und abends
 * zu niedrig. Jetzt zaehlt die Strahlung senkrecht zur Sonne (DNI), mit
 * sin(60°) so skaliert, dass sich bei hoher Sommersonne nichts aendert.
 *
 * Vergleich mit dem Referenzverfahren (Liljegren 2008, eigene Nachrechnung,
 * Sommer 2025, vier Orte in Deutschland, Stunden ab 22 °C bei Tageslicht):
 * mittlere Abweichung des WBGT von −0,8 auf −0,5 °C, um 8 Uhr von −2,1 auf
 * −1,2 °C; abends liegt die App jetzt bis 0,8 °C darueber (sichere Seite).
 */
export const SOLAR_REFERENCE_ELEVATION_DEG = 60;
export const SOLAR_REFERENCE_SIN = Math.sin((SOLAR_REFERENCE_ELEVATION_DEG * Math.PI) / 180);

/** Tg-Zuschlag: 0.045 · Solar / (1 + Wind), gedeckelt */
export const GLOBE_SOLAR_COEF = 0.045;
export const GLOBE_DELTA_MAX = 20;

/** Kontextstunden, die vor und nach der Einheit mit angezeigt werden. */
export const CONTEXT_HOURS = 5;

/** Laengste planbare Einheit (z. B. Radtour) – Formular und Ergebnisseite. */
export const MAX_SESSION_HOURS = 8;

/**
 * Obergrenze fuer die Balkenzahl: 5 Kontextstunden je Seite plus die
 * maximale Einheitsdauer.
 */
export const MAX_DISPLAY_HOURS = CONTEXT_HOURS * 2 + MAX_SESSION_HOURS;

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

/** Welche Open-Meteo-Abfrage ein Startzeitpunkt braucht. */
export type WeatherRequest =
  | { kind: 'forecast'; forecastDays: number }
  | { kind: 'review'; startDate: string; endDate: string };

/**
 * Vergangene Tage kommen aus dem Modell-Archiv, heute und die Zukunft aus der
 * Vorhersage. Das Archiv-Fenster reicht einen Tag vor und einen Tag nach der
 * Einheit – fuer den Vergleich mit Vortag und Folgetag und fuer
 * Kontextstunden ueber Mitternacht.
 */
export function weatherRequestFor(
  startTime?: Date | string,
  now: Date = new Date()
): WeatherRequest {
  if (startTime) {
    const day = localHourStamp(startTime).slice(0, 10);
    const today = localHourStamp(now).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day < today) {
      return {
        kind: 'review',
        startDate: shiftStampByDays(day, -1).slice(0, 10),
        endDate: shiftStampByDays(day, 1).slice(0, 10),
      };
    }
  }
  return { kind: 'forecast', forecastDays: forecastDaysFor(startTime) };
}

/**
 * Cache-Key. Koordinaten werden auf 4 Nachkommastellen (~11 m) gerundet, damit
 * minimal abweichende GPS-Werte nicht bei jedem Aufruf einen neuen Key erzeugen.
 *
 * Der Zeitraum (Vorhersagetage bzw. Archiv-Fenster) gehört in den Key: sonst würde eine zuvor
 * gecachte 2-Tage-Antwort für eine Anfrage in 5 Tagen wiederverwendet und die
 * gesuchte Stunde fehlte in den Daten.
 */
export function buildCacheKey(lat: number, lng: number, request: WeatherRequest): string {
  const span =
    request.kind === 'forecast'
      ? `${request.forecastDays}d`
      : `${request.startDate}_${request.endDate}`;
  return `${CACHE_PREFIX}${lat.toFixed(4)}_${lng.toFixed(4)}_${span}`;
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
 *                     Liegt er vor heute, kommt die Antwort aus dem Archiv.
 */
export async function fetchWeatherData(
  lat: number,
  lng: number,
  forceRefresh = false,
  startTime?: Date | string
): Promise<WeatherApiResponse> {
  const request = weatherRequestFor(startTime);
  const cacheKey = buildCacheKey(lat, lng, request);

  if (!forceRefresh) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }

  const url = new URL(request.kind === 'review' ? OPEN_METEO_REVIEW_URL : OPEN_METEO_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('hourly', HOURLY_PARAMS.join(','));
  url.searchParams.set('wind_speed_unit', 'ms'); // Berechnung erwartet m/s
  url.searchParams.set('timezone', 'auto');
  if (request.kind === 'review') {
    url.searchParams.set('start_date', request.startDate);
    url.searchParams.set('end_date', request.endDate);
  } else {
    url.searchParams.set('forecast_days', String(request.forecastDays));
    // Gestern mitladen – sonst fehlt der Vortag im Vergleich, wenn die Einheit heute ist
    url.searchParams.set('past_days', '1');
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("Wetterdienst antwortet nicht (Zeitüberschreitung).");
    }
    if (err instanceof TypeError) {
      throw new Error("Wetterdaten konnten nicht geladen werden.");
    }
    throw err;
  }
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
 * Index der gesuchten Stunde in `hourly.time`, oder -1, wenn sie nicht in den
 * Daten liegt. Open-Meteo liefert die Zeitstempel in lokaler Zeit des Ortes
 * ("2026-08-13T14:00"), daher wird auf String-Ebene verglichen statt via
 * Date-Parsing (das UTC annehmen wuerde).
 *
 * Bewusst kein Naeherungswert: eine stillschweigend falsche Stunde (etwa bei
 * einem alten geteilten Link) waere schlimmer als eine Fehlermeldung.
 */
export function findExactHourIndex(
  apiData: WeatherApiResponse,
  when: Date | string
): number {
  return apiData.hourly.time.indexOf(localHourStamp(when));
}

const REQUIRED_SERIES = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'direct_radiation_instant',
  'diffuse_radiation_instant',
] as const;

/**
 * Liegen fuer alle Stunden von `fromIndex` bis `toIndex` echte Zahlen vor?
 *
 * Open-Meteo fuellt Luecken im Archiv mit `null`. Ohne diese Pruefung wuerde
 * daraus ein WBGT von „NaN“ und eine gruene Ampel – lieber kein Ergebnis.
 */
export function hasCompleteHours(
  apiData: WeatherApiResponse,
  fromIndex: number,
  toIndex: number
): boolean {
  if (fromIndex < 0 || toIndex < fromIndex) return false;
  for (let i = fromIndex; i <= toIndex; i++) {
    for (const key of REQUIRED_SERIES) {
      const value = apiData.hourly[key]?.[i];
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    }
  }
  return true;
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
 * Natuerliche Feuchtkugel Tnw aus der psychrometrischen Feuchtkugel, der
 * Globalstrahlung, dem 2-m-Wind und der Feuchtkugeldifferenz (NWS/NDFD).
 *
 * Der Wert wird nie unter Tw gedrueckt: bei viel Wind naehern sich beide an,
 * eine Unterschreitung waere physikalisch nicht plausibel.
 */
function naturalWetBulbTemperature(
  tempC: number,
  wetBulb: number,
  globalRadiation: number,
  wind2m: number
): number {
  const adjusted =
    wetBulb +
    NWB_SOLAR_COEF * Math.max(0, globalRadiation) -
    NWB_WIND_COEF * Math.max(0, wind2m) +
    NWB_DEPRESSION_COEF * Math.max(0, tempC - wetBulb) +
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
 * Direktanteil fuer die Schwarzkugel: DNI × sin(60°). Fehlt die DNI (alter
 * Cache, Luecke im Archiv), bleibt es bei der waagerechten Direktstrahlung.
 */
export function globeDirectRadiation(
  directHorizontal: number,
  directNormal: number | null | undefined
): number {
  if (typeof directNormal === 'number' && Number.isFinite(directNormal) && directNormal > 0) {
    return directNormal * SOLAR_REFERENCE_SIN;
  }
  return Math.max(0, directHorizontal ?? 0);
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
    const direct = hourly.direct_radiation_instant[i];
    const diffuse = hourly.diffuse_radiation_instant[i];
    const dniRaw = hourly.direct_normal_irradiance_instant?.[i];
    const directNormal =
      typeof dniRaw === 'number' && Number.isFinite(dniRaw) ? dniRaw : null;
    const globeDirect = globeDirectRadiation(direct, directNormal);
    const uvRaw = hourly.uv_index?.[i];
    const uvIndex = typeof uvRaw === 'number' && Number.isFinite(uvRaw) ? uvRaw : null;

    const effectiveDirect = direct * shadowFactor;
    const effectiveDiffuse = diffuse * diffuseFactor;
    const wind2m = windAt2m(wind);

    const wetBulb = wetBulbTemperature(temp, humidity);
    const globalUnshaded = Math.max(0, direct ?? 0) + Math.max(0, diffuse ?? 0);
    const globalShaded = Math.max(0, effectiveDirect) + Math.max(0, effectiveDiffuse);
    const naturalWetBulbUnshaded = naturalWetBulbTemperature(
      temp,
      wetBulb,
      globalUnshaded,
      wind2m
    );
    const naturalWetBulbShaded = naturalWetBulbTemperature(
      temp,
      wetBulb,
      globalShaded,
      wind2m
    );
    // Die Kugel rechnet mit dem sonnenstandsunabhaengigen Direktanteil; die
    // natuerliche Feuchtkugel bleibt bei der Globalstrahlung, auf die ihre
    // Regression kalibriert ist.
    const solarUnshaded = solarLoad(globeDirect, diffuse);
    const solarShaded = solarLoad(globeDirect * shadowFactor, effectiveDiffuse);
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
      uvIndex,
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
        directNormal,
        globeDirect,
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
  if (!hasCompleteHours(apiData, sessionFromIndex, sessionToIndex)) return null;

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
