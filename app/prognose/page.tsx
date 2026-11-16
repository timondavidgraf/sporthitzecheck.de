"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  Droplets,
  History,
  Loader2,
  MapPin,
  RotateCcw,
  Share2,
  Siren,
  ThermometerSun,
} from "lucide-react";
import {
  DEFAULT_SHADOW,
  DEFAULT_SPORT,
  ageOffsetLabel,
  ageOptionsForSport,
  eventTypeFromIntensity,
  intensityOffsetLabel,
  labelFor,
  parseAgeGroup,
  parseIntensity,
  parseOption,
  parsePerformanceLevel,
  parseSurface,
  PERFORMANCE_OPTIONS,
  performanceOffsetLabel,
  SHADOW_OPTIONS,
  shortLabelFor,
  SPORT_OPTIONS,
  surfaceOffsetLabel,
  surfacesForSport,
  type IntensityLevel,
  type Sport,
} from "@/lib/formOptions";
import { AMPEL_BG, AMPEL_HEX, AMPEL_TEXT } from "@/lib/ampelColors";
import { fetchHeatWarning, type HeatWarning } from "@/lib/dwdWarnings";
import { reviewHeadline } from "@/lib/recommendations";
import { peakUvIndex, uvAdvice, uvCategory } from "@/lib/uvIndex";
import { BrandHeader } from "@/lib/BrandHeader";
import { DisclaimerBox } from "@/lib/DisclaimerBox";
import { FeedbackSupport } from "@/lib/FeedbackSupport";
import { InfoTip } from "@/lib/InfoTip";
import { WBGT_CALCULATED_NOTE, WBGT_EXPLAINER } from "@/lib/legal";
import { OsmMap } from "@/lib/OsmMap";
import {
  shadowEffectTip,
  surfaceEffectTip,
  wateringEffectTip,
} from "@/lib/pitchTooltips";
import { ShadowThumb, SurfaceThumb } from "@/lib/pitchVisuals";
import { ThresholdsBox } from "@/lib/ThresholdsBox";
import { ScienceSources, SourceInfoButton } from "@/lib/ScienceSources";
import { SurfaceNotes } from "@/lib/SurfaceNotes";
import { Tip } from "@/lib/TipPopover";
import {
  ageThresholdOffset,
  baseBoundsForSport,
  formatDecimal,
  formatSignedOffset,
  formatWbgtNumber,
  getSurfaceConfig,
  intensityHeadline,
  intensityThresholdOffset,
  performanceThresholdOffset,
  sportAllowsWatering,
  SPORTS,
  surfaceOffsetBreakdownValue,
  usesProfiThresholds,
} from "@/lib/sportsConfig";
import {
  sourceHref,
  sourcesRegistry,
  type SourceId,
} from "@/lib/sourcesRegistry";
import {
  calculateWBGTForecast,
  fetchWeatherData,
  findExactHourIndex,
  getAmpelThresholds,
  getForecastSummary,
  hasCompleteHours,
  CONTEXT_HOURS,
  EARLIEST_REVIEW_DATE,
  GLOBE_DELTA_MAX,
  GLOBE_SOLAR_COEF,
  localHourStamp,
  MAX_SESSION_HOURS,
  NWB_CONST,
  NWB_DEPRESSION_COEF,
  NWB_SOLAR_COEF,
  NWB_WIND_COEF,
  WIND_10M_TO_2M,
  sessionHourStamps,
  shiftStampByDays,
  SOLAR_DIFFUSE_WEIGHT,
  SOLAR_DIRECT_WEIGHT,
  SOLAR_REFERENCE_ELEVATION_DEG,
  summarizeSession,
  WATERING_COOLING,
  WATERING_MAX_HUMIDITY,
  WBGT_AIR_WEIGHT,
  WBGT_GLOBE_WEIGHT,
  WBGT_WET_BULB_WEIGHT,
  type AgeBand,
  type ColorCode,
  type PerformanceLevel,
  type WBGTBreakdown,
  type Shadow,
  type Surface,
  type WBGTHour,
} from "@/lib/wbgtCalculator";

// ---------------------------------------------------------------------------
// Prognose-Güte (DWD-Standards)
// ---------------------------------------------------------------------------

type Confidence = "high" | "medium" | "low";

/**
 * Je weiter der Startzeitpunkt entfernt liegt, desto unsicherer die Prognose.
 * Grenzen: unter 48 h sehr zuverlässig, 48–72 h gut, darüber nur noch Trend.
 */
function confidenceFor(hoursAhead: number): Confidence {
  if (hoursAhead > 72) return "low";
  if (hoursAhead >= 48) return "medium";
  return "high";
}

const HOUR_MS = 3_600_000;

/** Der DWD warnt für heute und den Folgetag; weiter voraus lohnt die Abfrage nicht. */
const HEAT_WARNING_LOOKAHEAD_HOURS = 60;

function isStamp(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

function plusOneHour(stamp: string): string {
  const d = new Date(stamp);
  return Number.isNaN(d.getTime())
    ? stamp
    : localHourStamp(new Date(d.getTime() + HOUR_MS));
}

/**
 * Ende der Einheit, höchstens {@link MAX_SESSION_HOURS} nach dem Beginn. Das
 * Formular erzeugt nie längere Einheiten; ein von Hand verlängerter Link würde
 * sonst ein Diagramm über mehrere Tage mit doppelten Stunden-Beschriftungen bauen.
 */
function clampEnd(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return endTime;

  const latest = new Date(start.getTime() + MAX_SESSION_HOURS * HOUR_MS);
  if (end <= latest) return endTime;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localHourStamp(latest).slice(0, 11)}${pad(latest.getHours())}:${pad(latest.getMinutes())}`;
}

const OUT_OF_RANGE_MESSAGE = `Für diesen Zeitraum liegen keine Wetterdaten vor. Der Rückblick reicht bis ${formatFullDate(
  EARLIEST_REVIEW_DATE
)} zurück, die Vorhersage etwa zwei Wochen voraus.`;

/** "2022-01-01" -> "01.01.2022" */
function formatFullDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** "2026-08-13" -> "Do., 13.08." */
function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export default function RadarPage() {
  // useSearchParams zwingt die Komponente ins Client-Rendering – ohne Suspense
  // schlägt der Build beim Prerendering fehl.
  return (
    <Suspense fallback={<RadarSkeleton />}>
      <RadarContent />
    </Suspense>
  );
}

/** Spitzenwert der Einheit am Vortag / gewählten Tag / Folgetag. */
interface DayComparison {
  offset: -1 | 0 | 1;
  label: string;
  date: string;
  maxWbgt: number | null;
  colorCode: ColorCode | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      forecast: WBGTHour[];
      hoursAhead: number;
      /** Die Einheit ist bereits vorbei: Rückblick statt Prognose. */
      isReview: boolean;
      /** Amtliche DWD-Hitzewarnung für den Zeitraum; null = keine oder nicht abrufbar. */
      heatWarning: HeatWarning | null;
      comparison: DayComparison[];
    };

function RadarContent() {
  const searchParams = useSearchParams();
  const paramKey = searchParams.toString();

  const [state, setState] = useState<LoadState>({ status: "loading" });

  // Alle Einstellungen kommen ausschließlich aus der URL
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const hasValidCoords =
    latRaw !== null &&
    lngRaw !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  const sport = parseOption(searchParams.get("sport"), SPORT_OPTIONS, DEFAULT_SPORT);
  const ageGroup = parseAgeGroup(searchParams.get("age"));
  const performanceLevel = parsePerformanceLevel(searchParams.get("level"), ageGroup);
  const intensity = parseIntensity(searchParams.get("intensity"));
  const eventType = eventTypeFromIntensity(sport, intensity);
  const surface = parseSurface(searchParams.get("surface"), sport);
  const shadow = parseOption(searchParams.get("shadow"), SHADOW_OPTIONS, DEFAULT_SHADOW);
  const watered =
    sportAllowsWatering(sport) && searchParams.get("watered") === "true";

  // "2026-08-13T14:30" – fehlt oder unbrauchbar: aktuelle Stunde
  const startRaw = searchParams.get("start");
  const startTime = isStamp(startRaw) ? startRaw : localHourStamp(new Date());

  // Ohne gültige Endzeit gilt die Einheit als eine Stunde lang
  const endRaw = searchParams.get("end");
  const endTime = clampEnd(
    startTime,
    isStamp(endRaw) && endRaw > startTime ? endRaw : plusOneHour(startTime)
  );

  useEffect(() => {
    let cancelled = false;

    // Kein synchrones setState im Effect-Body: der Start-State ist bereits
    // "loading", gesetzt wird erst im aufgelösten Promise.
    void (async () => {
      if (!hasValidCoords) {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Keine gültigen Koordinaten in der URL gefunden.",
          });
        }
        return;
      }

      // Vor dem Archivbeginn gibt es nichts abzufragen – ohne Umweg über die API
      if (startTime.slice(0, 10) < EARLIEST_REVIEW_DATE) {
        if (!cancelled) setState({ status: "error", message: OUT_OF_RANGE_MESSAGE });
        return;
      }

      // DWD-Warnungen gibt es nur für die nächsten Tage – parallel zum Wetter
      // abrufen, damit die Ampel nicht darauf wartet. Fehler ergeben null.
      const sessionStart = new Date(startTime);
      const sessionEnd = new Date(endTime);
      const warningRelevant =
        sessionEnd.getTime() > Date.now() &&
        sessionStart.getTime() - Date.now() < HEAT_WARNING_LOOKAHEAD_HOURS * HOUR_MS;
      const heatWarningRequest = warningRelevant
        ? fetchHeatWarning(lat, lng, sessionStart, sessionEnd)
        : Promise.resolve(null);

      try {
        const data = await fetchWeatherData(lat, lng, false, startTime);

        // Nur exakte Treffer: liegt die Einheit ausserhalb der Daten (z. B. ein
        // alter geteilter Link), duerfen keine Nachbarstunden einspringen.
        const { from, to } = sessionHourStamps(startTime, endTime);
        const sessionFromIndex = findExactHourIndex(data, from);
        const sessionToIndex = findExactHourIndex(data, to);
        if (
          sessionFromIndex === -1 ||
          sessionToIndex === -1 ||
          // Lücken im Archiv kommen als null – daraus darf keine Ampel entstehen
          !hasCompleteHours(data, sessionFromIndex, sessionToIndex)
        ) {
          if (!cancelled) setState({ status: "error", message: OUT_OF_RANGE_MESSAGE });
          return;
        }

        const forecast = calculateWBGTForecast(data, {
          surface,
          shadow,
          watered,
          ageGroup,
          performanceLevel,
          sport,
          eventType,
          intensity,
          sessionFromIndex,
          sessionToIndex,
        });

        const hoursAhead = (new Date(startTime).getTime() - Date.now()) / HOUR_MS;
        const isReview = new Date(endTime).getTime() < Date.now();

        // Gleicher Zeitraum am Vortag und am Folgetag – lohnt sich das Verschieben?
        const comparison: DayComparison[] = ([-1, 0, 1] as const).map((offset) => {
          const shiftedStart = shiftStampByDays(startTime, offset);
          const shiftedEnd = shiftStampByDays(endTime, offset);
          const result = summarizeSession(data, {
            surface,
            shadow,
            watered,
            ageGroup,
            performanceLevel,
            sport,
            eventType,
            intensity,
            startTime: shiftedStart,
            endTime: shiftedEnd,
          });

          return {
            offset,
            label: offset === -1 ? "Vortag" : offset === 0 ? "Gewählt" : "Folgetag",
            date: shiftedStart.slice(0, 10),
            maxWbgt: result?.maxWbgt ?? null,
            colorCode: result?.colorCode ?? null,
          };
        });

        const heatWarning = await heatWarningRequest;

        if (!cancelled) {
          setState({ status: "ready", forecast, hoursAhead, isReview, heatWarning, comparison });
        }
      } catch (err) {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        // Offline ist ein Nutzungszustand, kein Bug – den nicht als Fehler melden.
        if (!offline) {
          Sentry.captureException(err, { tags: { feature: "wbgt-forecast" } });
        }
        if (!cancelled) {
          setState({
            status: "error",
            message: offline
              ? "Keine Internetverbindung. Die Wetterdaten konnten nicht geladen werden."
              : "Die Wetterdaten konnten nicht geladen werden. Bitte später erneut versuchen.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // paramKey deckt alle abgeleiteten Werte ab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  // Der Seitentitel kommt statisch aus dem Layout („Prognose“); für vergangene
  // Termine stimmt er nicht und wird hier im Browser nachgezogen.
  const isReview = state.status === "ready" && state.isReview;
  useEffect(() => {
    document.title = `${isReview ? "Rückblick" : "Prognose"} – SportHitzeCheck`;
  }, [isReview]);

  if (state.status === "loading") return <RadarSkeleton />;
  if (state.status === "error") return <RadarError message={state.message} />;

  // Die Ampel bewertet ausschliesslich die Einheit selbst – die Kontextstunden
  // davor und danach dienen nur der Einordnung und dürfen das Urteil nicht
  // verschärfen.
  const sessionHours = state.forecast.filter((h) => h.inSession);
  const summary = getForecastSummary(sessionHours);
  if (!summary) return <RadarError message="Für diesen Zeitraum liegen keine Daten vor." />;

  const peakHour = sessionHours.reduce((a, b) => (b.wbgtValue > a.wbgtValue ? b : a));
  const sessionLabel = `${startTime.slice(11, 16)}–${endTime.slice(11, 16)}`;
  const confidence = confidenceFor(state.hoursAhead);
  const hasDayCompare = state.comparison.some((d) => d.offset !== 0 && d.maxWbgt !== null);

  const chartData = state.forecast.map((hour) => ({
    label: `${hour.timestamp.slice(11, 13)}`,
    wbgt: hour.wbgtValue,
    // vorformatiert, damit LabelList ohne Formatter auskommt
    wbgtLabel: `${formatDecimal(hour.wbgtValue)}°`,
    color: AMPEL_HEX[hour.colorCode],
    // Kontextstunden blasser, damit der gebuchte Zeitraum sofort ins Auge fällt
    opacity: hour.inSession ? 1 : 0.3,
    inSession: hour.inSession,
  }));

  const sessionBars = chartData.filter((d) => d.inSession);
  const sessionBox =
    sessionBars.length > 0
      ? { x1: sessionBars[0].label, x2: sessionBars[sessionBars.length - 1].label }
      : null;

  const values = state.forecast.map((h) => h.wbgtValue);
  const yMin = Math.max(0, Math.floor(Math.min(...values) - 3));
  const yMax = Math.ceil(Math.max(...values) + 1);

  return (
    <PageShell>
      {state.isReview && <ReviewNotice date={startTime.slice(0, 10)} />}
      {state.heatWarning && <HeatWarningNotice warning={state.heatWarning} />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AmpelBox
          summary={summary}
          peakHour={peakHour}
          uvIndex={peakUvIndex(sessionHours)}
          reviewLabel={
            state.isReview ? reviewHeadline(summary.colorCode, eventType, sport) : null
          }
        />

        <ThresholdsBox
          sport={sport}
          ageGroup={ageGroup}
          performanceLevel={performanceLevel}
          intensity={intensity}
          colorCode={summary.colorCode}
          maxWbgt={summary.maxWbgt}
        />

        <PlaceBox
          lat={lat}
          lng={lng}
          startTime={startTime}
          sessionLabel={sessionLabel}
          sport={sport}
          surface={surface}
          shadow={shadow}
          watered={watered}
          className="md:col-span-2 lg:col-span-1"
        />

        <Panel className={hasDayCompare ? "md:col-span-2" : "md:col-span-2 lg:col-span-3"}>
          {confidence === "low" && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-bold">Achtung: Trendprognose.</strong> Verlässliche
                WBGT-Warnungen sind erst 3 Tage im Voraus möglich.
              </span>
            </p>
          )}
          {confidence === "medium" && (
            <p className="mb-2 text-xs text-slate-500">
              Gute Zuverlässigkeit, leichte Schwankungen möglich.
            </p>
          )}

          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Verlauf
            </h2>
            <VerlaufInfoTip sessionLabel={sessionLabel} />
          </div>
          <div className="mt-2 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 22, right: 8, bottom: 4, left: 8 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis hide domain={[yMin, yMax]} />
                {sessionBox && (
                  <ReferenceArea
                    x1={sessionBox.x1}
                    x2={sessionBox.x2}
                    ifOverflow="visible"
                    fill="#f97316"
                    fillOpacity={0.08}
                    stroke="#ea580c"
                    strokeWidth={2}
                    radius={8}
                    zIndex={400}
                  />
                )}
                <Bar dataKey="wbgt" radius={[6, 6, 3, 3]} isAnimationActive={false}>
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} fillOpacity={entry.opacity} />
                  ))}
                  <LabelList
                    dataKey="wbgtLabel"
                    position="top"
                    offset={8}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#0f172a" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {hasDayCompare && (
          <Panel className="md:col-span-2 lg:col-span-1">
            <DayCompare days={state.comparison} sessionLabel={sessionLabel} />
          </Panel>
        )}

        <div className="md:col-span-2 lg:col-span-3">
          <Breakdown
            hour={peakHour}
            sport={sport}
            surface={surface}
            shadow={shadow}
            ageGroup={ageGroup}
            performanceLevel={performanceLevel}
            intensity={intensity}
            startLabel={peakHour.timestamp.slice(11, 16)}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <ScienceSources
            sport={sport}
            surface={surface}
            colorCode={summary.colorCode}
            recommendationQuelleId={summary.recommendationQuelleId}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <DisclaimerBox />
        </div>

        <Panel className="md:col-span-2 lg:col-span-3">
          <Actions />
          <p className="pt-3 text-center text-sm leading-relaxed text-gray-500">
            WBGT-Näherung auf Basis von Open-Meteo.
          </p>
        </Panel>
      </div>
      <div className="mt-4">
        <FeedbackSupport />
      </div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Tagesvergleich
// ---------------------------------------------------------------------------

/**
 * Derselbe Zeitraum am Vortag und am Folgetag – zeigt auf einen Blick, ob sich
 * das Verschieben der Einheit um einen Tag lohnt.
 */
function DayCompare({
  days,
  sessionLabel,
}: {
  days: DayComparison[];
  sessionLabel: string;
}) {
  // Ohne mindestens einen Nachbartag ist der Vergleich sinnlos
  if (!days.some((d) => d.offset !== 0 && d.maxWbgt !== null)) return null;

  return (
    <div>
      <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
        Gleicher Zeitraum an anderen Tagen
      </h2>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {days.map((day) => (
          <div
            key={day.offset}
            className={`rounded-lg border p-2.5 text-center ${
              day.offset === 0
                ? "border-slate-300 bg-slate-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500">{day.label}</p>
            <p className="text-[11px] text-slate-400">{formatDay(day.date)}</p>

            {day.maxWbgt !== null && day.colorCode ? (
              <p className="mt-1.5 flex items-center justify-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-full inline-block shrink-0 ${
                    AMPEL_BG[day.colorCode]
                  }`}
                  aria-hidden
                />
                <span className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatDecimal(day.maxWbgt)}°
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-base font-bold text-slate-300">–</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-1 text-[11px] text-slate-400">
        Spitzenwert jeweils {sessionLabel} Uhr. Ein Strich bedeutet: für diesen Tag
        liegen keine Daten vor.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transparenz-Modul
// ---------------------------------------------------------------------------

function signed(value: number): string {
  return `${value < 0 ? "−" : "+"}${formatDecimal(Math.abs(value))} °C`;
}

function pct(factor: number): string {
  return `${Math.round(factor * 100)} %`;
}

function watt(value: number): string {
  return `${Math.round(value)} W/m²`;
}

/**
 * Der Bewässerungsabzug entfällt nachts und bei schwüler Luft. Ohne Begründung
 * wirkt die 0,0 in der Aufschlüsselung wie ein Fehler.
 */
function wateringBreakdownLabel(b: WBGTBreakdown): string {
  if (!b.watered) return "Abzug Bewässerung (nicht gewählt)";
  if (b.wateringOffset !== 0) {
    return `Abzug Bewässerung (−${formatDecimal(WATERING_COOLING)} °C, 1. Stunde)`;
  }
  if (b.globalUnshaded <= 0) {
    return "Abzug Bewässerung (entfällt ohne Sonne)";
  }
  if (b.humidity >= WATERING_MAX_HUMIDITY) {
    return `Abzug Bewässerung (entfällt über ${WATERING_MAX_HUMIDITY} % Luftfeuchte)`;
  }
  return "Abzug Bewässerung (nur in der 1. Stunde)";
}

function Breakdown({
  hour,
  sport,
  surface,
  shadow,
  ageGroup,
  performanceLevel,
  intensity,
  startLabel,
}: {
  hour: WBGTHour;
  sport: Sport;
  surface: Surface;
  shadow: Shadow;
  ageGroup: AgeBand;
  performanceLevel: PerformanceLevel;
  intensity: IntensityLevel;
  startLabel: string;
}) {
  const b = hour.breakdown;
  const thresholds = getAmpelThresholds(
    sport,
    ageGroup,
    intensity,
    performanceLevel
  );
  const shadeLabel = shortLabelFor(SHADOW_OPTIONS, shadow);
  const surfaceCfg = getSurfaceConfig(sport, surface);
  const surfaceLabel = surfaceCfg.name;
  const ageLabel = labelFor(ageOptionsForSport(sport), ageGroup);
  const performanceLabel = labelFor(PERFORMANCE_OPTIONS, performanceLevel);
  const intensityName = intensityHeadline(intensity);
  const ageOff = ageThresholdOffset(sport, ageGroup);
  const performanceOff = performanceThresholdOffset(
    sport,
    ageGroup,
    performanceLevel
  );
  const intensityOff = intensityThresholdOffset(intensity);
  const offsetSum = ageOff + performanceOff + intensityOff;
  const ageSourceId = ageGroup === "senior" ? "aging_heat" : "acsm_general";
  const base = baseBoundsForSport(sport);
  const sportSource = sourcesRegistry[SPORTS[sport].thresholds.sourceId];
  const sportOrg = sportSource.organisation ?? sportSource.name;
  const surfaceInfo = (
    <SourceInfoButton sourceId={surfaceCfg.quelle_id} variant="anchor" />
  );

  const formula =
    `${WBGT_WET_BULB_WEIGHT}×Tnw + ${WBGT_GLOBE_WEIGHT}×Tg + ${WBGT_AIR_WEIGHT}×Ta`;
  const solarFormula = `${SOLAR_DIRECT_WEIGHT}×Gkugel + ${SOLAR_DIFFUSE_WEIGHT}×Gdif`;
  const globeFormula = `${GLOBE_SOLAR_COEF}×Solar / (1+Wind 2 m), max. ${GLOBE_DELTA_MAX} K`;
  const nwbFormula = `Tw + ${NWB_SOLAR_COEF}×Global − ${NWB_WIND_COEF}×Wind 2 m + ${NWB_DEPRESSION_COEF}×(Ta − Tw) + ${NWB_CONST}`;

  return (
    <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-semibold text-slate-700">
        Wie wird dieser Wert berechnet?
        <ChevronDown
          className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="flex flex-col gap-4 border-t border-gray-200 p-3">
        <p className="text-xs text-slate-500">
          Spitzenstunde {startLabel} – alle Schritte der im Code hinterlegten Näherung.
        </p>

        <BreakdownSection title="1. Wetterdaten (Open-Meteo)">
          <BreakdownRow label="Lufttemperatur Ta" value={`${formatDecimal(b.temperature)} °C`} />
          <BreakdownRow label="Relative Feuchte" value={`${Math.round(b.humidity)} %`} />
          <BreakdownRow label="Wind (10 m)" value={`${formatDecimal(b.wind)} m/s`} />
          <BreakdownRow
            label="Globalstrahlung (Gdir + Gdif)"
            value={watt(b.globalUnshaded)}
          />
          <BreakdownRow label="Direktstrahlung Gdir (waagerecht)" value={watt(b.directRadiation)} />
          <BreakdownRow
            label="Direktstrahlung senkrecht zur Sonne (DNI)"
            value={b.directNormal !== null ? watt(b.directNormal) : "nicht geliefert"}
            numeric={b.directNormal !== null}
          />
          <BreakdownRow label="Diffuse Strahlung Gdif" value={watt(b.diffuseRadiation)} />
        </BreakdownSection>

        <BreakdownSection
          title={`2. Beschattung (${shadeLabel})`}
          hint="Direktstrahlung und Untergrund-Zuschlag teilen sich denselben Faktor. Diffuse Himmelsstrahlung bleibt unter Bäumen weitgehend, unter Dach nur als Restlicht."
        >
          <BreakdownRow label="Faktor Direktstrahlung" value={pct(b.shadowFactor)} />
          <BreakdownRow label="Faktor diffuse Strahlung" value={pct(b.diffuseFactor)} />
          <BreakdownRow label="Wirksame Direktstrahlung" value={watt(b.effectiveDirect)} />
          <BreakdownRow label="Wirksame diffuse Strahlung" value={watt(b.effectiveDiffuse)} />
        </BreakdownSection>

        <BreakdownSection
          title="3. Feuchtkugel, Schwarzkugel, Basis-WBGT"
          hint={`Wind 10 m → 2 m nach FAO-56 (×${formatDecimal(WIND_10M_TO_2M, 2)}). Tw nach Stull (2011) aus Ta und Feuchte, dann Tnw nach dem Verfahren des US-Wetterdienstes (NWS/NDFD): ${nwbFormula}. Solarlast ${solarFormula}; Gkugel = DNI × sin ${SOLAR_REFERENCE_ELEVATION_DEG}°, weil eine Kugel die Sonne unabhängig vom Sonnenstand einfängt (ohne DNI: Gdir). Tg = Ta + ${globeFormula}. WBGT = ${formula}.`}
        >
          <BreakdownRow label="Wind auf 2 m" value={`${formatDecimal(b.wind2m)} m/s`} />
          <BreakdownRow
            label="Psychrometrische Feuchtkugel Tw"
            value={`${formatDecimal(b.wetBulb)} °C`}
          />
          <BreakdownRow
            label="Natürliche Feuchtkugel Tnw ohne Schatten"
            value={`${formatDecimal(b.naturalWetBulbUnshaded)} °C`}
            info={<SourceInfoButton sourceId="wbgt_model" variant="anchor" />}
          />
          <BreakdownRow
            label="Natürliche Feuchtkugel Tnw mit Schatten"
            value={`${formatDecimal(b.naturalWetBulbShaded)} °C`}
          />
          <BreakdownRow label="Direktanteil der Kugel Gkugel" value={watt(b.globeDirect)} />
          <BreakdownRow label="Solarlast ohne Schatten" value={watt(b.solarUnshaded)} />
          <BreakdownRow label="Solarlast mit Schatten" value={watt(b.solarShaded)} />
          <BreakdownRow
            label="Tg-Zuschlag ohne Schatten"
            value={`${formatDecimal(b.globeDeltaUnshaded)} K`}
          />
          <BreakdownRow
            label="Tg-Zuschlag mit Schatten"
            value={`${formatDecimal(b.globeDeltaShaded)} K${
              b.globeDeltaCapped ? ` (auf ${GLOBE_DELTA_MAX} K begrenzt)` : ""
            }`}
          />
          <BreakdownRow label="Schwarzkugel Tg ohne Schatten" value={`${formatDecimal(b.globeUnshaded)} °C`} />
          <BreakdownRow label="Schwarzkugel Tg mit Schatten" value={`${formatDecimal(b.globeShaded)} °C`} />
          <BreakdownRow
            label={`Basis-WBGT volle Sonne (${formula})`}
            value={`${formatDecimal(b.baseWbgt)} °C`}
          />
          <BreakdownRow
            label="Basis-WBGT nach Beschattung"
            value={`${formatDecimal(b.shadedWbgt)} °C`}
          />
          <BreakdownRow
            label="Abzug Strahlung durch Beschattung"
            value={signed(b.shadeRadiationAdjustment)}
          />
        </BreakdownSection>

        <BreakdownSection
          title="4. Platzkorrekturen"
          hint={`Bewässerung: höchstens −${formatDecimal(WATERING_COOLING)} °C, nur in der ersten Stunde und nur bei Sonne unter ${WATERING_MAX_HUMIDITY} % Luftfeuchte. Bei schwüler Luft hebt die Verdunstung die Feuchtkugel an, statt zu kühlen.`}
        >
          {b.surfaceOffsetApplied ? (
            <>
              <BreakdownRow
                label={`Zuschlag Untergrund (${surfaceLabel})`}
                value={surfaceOffsetBreakdownValue(surfaceCfg)}
                numeric={false}
                info={surfaceInfo}
              />
              <BreakdownRow
                label={`× Beschattungsfaktor ${pct(b.shadowFactor)}`}
                value={`${signed(b.effectiveSurfaceOffset)} wirksam`}
              />
              <BreakdownRow
                label="Abzug Untergrund durch Beschattung"
                value={signed(b.shadowAdjustment)}
              />
            </>
          ) : (
            <BreakdownRow
              label={`Zuschlag Untergrund (${surfaceLabel})`}
              value={surfaceOffsetBreakdownValue(surfaceCfg)}
              numeric={false}
              info={surfaceInfo}
            />
          )}
          <BreakdownRow
            label={wateringBreakdownLabel(b)}
            value={signed(b.wateringOffset)}
          />
        </BreakdownSection>

        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-3 border-t border-gray-200 pt-2">
            <dt className="font-bold text-slate-900">
              Finaler WBGT
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                {formatDecimal(b.baseWbgt)} {signed(b.shadeRadiationAdjustment)}{" "}
                {signed(b.effectiveSurfaceOffset)} {signed(b.wateringOffset)}
              </span>
            </dt>
            <dd className="shrink-0 font-extrabold text-slate-900 tabular-nums">
              {formatDecimal(hour.wbgtValue)} °C
            </dd>
          </div>
        </dl>

        <BreakdownSection
          title="5. Intensität & Dauer"
          hint="ACGIH-Analogie auf die Ampel-Schwellen, nicht auf den WBGT-Wert. Alters-, Leistungs- und Intensitäts-Offset sind Näherungen – zusammen nicht sicherer."
        >
          <BreakdownRow
            label={`Intensitäts-Offset (${intensityName})`}
            value={intensityOffsetLabel(intensity)}
            info={<SourceInfoButton sourceId="acgih_tlv" variant="anchor" />}
          />
          <BreakdownRow
            label={`Alters-Offset (${ageLabel})`}
            value={ageOffsetLabel(sport, ageGroup)}
            info={
              ageOff !== 0 ? (
                <SourceInfoButton sourceId={ageSourceId} variant="anchor" />
              ) : undefined
            }
          />
          <BreakdownRow
            label={`Leistungs-Offset (${performanceLabel})`}
            value={performanceOffsetLabel(sport, ageGroup, performanceLevel)}
            info={
              usesProfiThresholds(sport) ? (
                <SourceInfoButton sourceId="acsm_general" variant="anchor" />
              ) : undefined
            }
          />
          <BreakdownRow
            label="Summe der Schwellen-Offsets"
            value={formatSignedOffset(offsetSum)}
          />
        </BreakdownSection>

        <BreakdownSection
          title="6. Ampel"
          hint="finale Schwelle = Verbands- bzw. Fallback-Schwelle + Alters-Offset + Leistungs-Offset + Intensitäts-Offset. Die Offsets sind Sicherheits-Näherungen."
        >
          {usesProfiThresholds(sport) ? (
            <BreakdownRow
              label={`Verbandsschwelle (${labelFor(SPORT_OPTIONS, sport)}, ${sportOrg})`}
              value={formatWbgtNumber(base.orange_max)}
              info={<SourceInfoButton sourceId={sportSource.id} variant="anchor" />}
            />
          ) : (
            <BreakdownRow
              label="Fallback-Schwelle (ACSM, kein Verbandswert)"
              value={formatWbgtNumber(base.orange_max)}
              info={<SourceInfoButton sourceId={sportSource.id} variant="anchor" />}
            />
          )}
          <BreakdownRow
            label={`Alters-Offset (${ageLabel})`}
            value={ageOffsetLabel(sport, ageGroup)}
          />
          <BreakdownRow
            label={`Leistungs-Offset (${performanceLabel})`}
            value={performanceOffsetLabel(sport, ageGroup, performanceLevel)}
          />
          <BreakdownRow
            label={`Intensitäts-Offset (${intensityName})`}
            value={intensityOffsetLabel(intensity)}
          />
          <BreakdownRow
            label="Finale Schwelle Rot"
            value={formatWbgtNumber(thresholds.orange_max)}
          />
          <BreakdownRow label="Grün" value={`≤ ${formatDecimal(thresholds.gruen_max)} °C`} />
          <BreakdownRow
            label="Gelb"
            value={`> ${formatDecimal(thresholds.gruen_max)} – ${formatDecimal(thresholds.gelb_max)} °C`}
          />
          <BreakdownRow
            label="Orange"
            value={`> ${formatDecimal(thresholds.gelb_max)} – ${formatDecimal(thresholds.orange_max)} °C`}
          />
          <BreakdownRow label="Rot" value={`> ${formatDecimal(thresholds.orange_max)} °C`} />
        </BreakdownSection>
      </div>
    </details>
  );
}

function BreakdownSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">{title}</h3>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{hint}</p>}
      <dl className="mt-1.5 flex flex-col gap-1.5 text-sm">{children}</dl>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  info,
  numeric = true,
}: {
  label: string;
  value: string;
  info?: ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="min-w-0 text-slate-600">{label}</dt>
      <dd
        className={`flex max-w-[58%] items-start justify-end gap-1 text-right font-semibold text-slate-800 ${
          numeric ? "tabular-nums" : ""
        }`}
      >
        <span>{value}</span>
        {info}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------

function Actions() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "SportHitzeCheck",
          text: "Hitzebelastung am Sportplatz",
          url,
        });
        return;
      } catch (err) {
        // Abbruch im Teilen-Dialog ist kein Fehler – dann nichts weiter tun
        if (err instanceof Error && err.name === "AbortError") return;
        // Sonst (z.B. iframe ohne allow="web-share") auf die Zwischenablage ausweichen
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Link zum Kopieren:", url);
    }
  };

  return (
    <div className="flex gap-2">
      <Link
        href="/"
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
      >
        <RotateCcw className="size-4" aria-hidden />
        Neu berechnen
      </Link>
      <button
        type="button"
        onClick={() => void share()}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
      >
        {copied ? (
          <>
            <Check className="size-4" aria-hidden />
            Link kopiert
          </>
        ) : (
          <>
            <Share2 className="size-4" aria-hidden />
            Ergebnis teilen
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout-Bausteine
// ---------------------------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 lg:max-w-6xl">
      <div className="mb-4">
        <BrandHeader />
      </div>
      {children}
    </main>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function AmpelBox({
  summary,
  peakHour,
  uvIndex,
  reviewLabel,
}: {
  summary: {
    maxWbgt: number;
    colorCode: ColorCode;
    recommendationLabel: string;
    recommendationPoints: string[];
    hauptempfehlung: string;
    recommendationQuelleId: SourceId;
    officialDecisionNote?: string;
  };
  peakHour: WBGTHour;
  /** Höchster UV-Index während der Einheit; null = nicht verfügbar */
  uvIndex: number | null;
  /** Überschrift im Rückblick; null = normale Planungs-Überschrift */
  reviewLabel: string | null;
}) {
  const airTemp = peakHour.breakdown.temperature;
  const source = sourcesRegistry[summary.recommendationQuelleId];
  const uvHint = uvIndex !== null ? uvAdvice(uvIndex) : null;

  return (
    <section
      className={`flex h-full flex-col rounded-xl p-4 shadow-sm ${AMPEL_BG[summary.colorCode]} ${AMPEL_TEXT[summary.colorCode]}`}
    >
      <p className="text-xs font-bold tracking-wider uppercase opacity-80">
        Spitzenwert während der Einheit
      </p>
      <div className="mt-1 flex flex-wrap items-end gap-x-5 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold tracking-tight tabular-nums">
            {formatDecimal(summary.maxWbgt)}
          </span>
          <span className="inline-flex items-baseline gap-1 text-xl font-bold">
            °C WBGT
            <WbgtInfoTip />
          </span>
        </p>
        <p className="flex items-baseline gap-1.5 pb-1">
          <span className="text-2xl font-extrabold tabular-nums">{formatDecimal(airTemp)}</span>
          <span className="text-sm font-bold opacity-80">°C Luft</span>
        </p>
      </div>
      {uvIndex !== null && uvIndex >= 0.5 ? (
        <p className="mt-1 text-sm leading-snug font-semibold opacity-90">
          UV-Index {Math.round(uvIndex)} ({uvCategory(uvIndex)})
          {uvHint ? ` – ${uvHint}` : ""}
        </p>
      ) : null}
      <p className="mt-3 text-base leading-snug font-bold">
        {reviewLabel ?? summary.recommendationLabel}
      </p>
      {reviewLabel ? (
        <p className="mt-1 text-xs font-bold tracking-wider uppercase opacity-80">
          Für solche Bedingungen gilt
        </p>
      ) : null}
      <p className="mt-1 text-sm leading-snug font-medium opacity-90">
        {summary.hauptempfehlung}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-snug font-medium opacity-90">
        {summary.recommendationPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <a
        href={sourceHref(summary.recommendationQuelleId)}
        className="mt-2 self-start text-[11px] font-medium opacity-75 underline decoration-current/40 underline-offset-2 hover:opacity-100"
      >
        Quelle: {source.name}
        <sup className="ml-0.5">↗</sup>
      </a>
      {summary.officialDecisionNote ? (
        <p className="mt-3 rounded-lg border border-current/30 bg-black/10 px-3 py-2 text-xs leading-snug font-medium italic opacity-90">
          {summary.officialDecisionNote}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Kennzeichnet das Ergebnis als Rückblick. Die Empfehlungen in der Ampel sind
 * für die Planung formuliert; der Hinweis ordnet sie für einen vergangenen
 * Termin ein und sagt klar, dass keine Messung dahintersteht.
 */
function ReviewNotice({ date }: { date: string }) {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm leading-snug text-slate-700">
      <History className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
      <span>
        <strong className="font-bold">Rückblick auf den {formatFullDate(date)}.</strong>{" "}
        Die Werte stammen aus archivierten Wettermodelldaten (Open-Meteo), nicht aus
        einer Messung vor Ort. Sie zeigen, wie die Einheit nach heutigem Stand
        eingestuft worden wäre – als Einordnung, nicht als Nachweis.
      </span>
    </p>
  );
}

/**
 * Amtliche Hitzewarnung des DWD für den Zeitraum der Einheit. Steht neben der
 * Ampel, nicht an ihrer Stelle: die Warnung gilt für die Allgemeinbevölkerung
 * und die ganze Region, die Ampel für diese Einheit an diesem Platz.
 */
function HeatWarningNotice({ warning }: { warning: HeatWarning }) {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm leading-snug text-red-900">
      <Siren className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
      <span>
        <strong className="font-bold">
          Amtliche Hitzewarnung des DWD, Stufe {warning.level} (
          {warning.level === 2 ? "extreme" : "starke"} Wärmebelastung).
        </strong>{" "}
        Sie gilt für diesen Zeitraum und die ganze Region. Hitzeschutzpläne im Sport
        knüpfen ihre Maßnahmen an diese Stufen – die Ampel unten bewertet zusätzlich
        Sportart, Gruppe und Platz.{" "}
        <a
          href="https://www.dwd.de/DE/wetter/warnungen_gemeinden/warnWetter_node.html"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          Warnlage beim DWD
        </a>
      </span>
    </p>
  );
}

function VerlaufInfoTip({ sessionLabel }: { sessionLabel: string }) {
  return (
    <Tip
      label="Hinweis zum Verlauf"
      buttonClassName="inline-flex size-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
    >
      Der Rahmen markiert den Zeitraum der Einheit ({sessionLabel} Uhr). Blasse
      Balken = {CONTEXT_HOURS} Stunden davor und danach.
    </Tip>
  );
}

function WbgtInfoTip() {
  return (
    <Tip
      label="Was ist WBGT?"
      align="left"
      className="self-center"
      buttonClassName="inline-flex size-5 items-center justify-center rounded-full bg-white/25 text-current transition hover:bg-white/40"
      iconStrokeWidth={2.5}
    >
      <span className="block">{WBGT_EXPLAINER}</span>
      <span className="mt-2 block">{WBGT_CALCULATED_NOTE}</span>
    </Tip>
  );
}

function PlaceBox({
  lat,
  lng,
  startTime,
  sessionLabel,
  sport,
  surface,
  shadow,
  watered,
  className = "",
}: {
  lat: number;
  lng: number;
  startTime: string;
  sessionLabel: string;
  sport: Sport;
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  className?: string;
}) {
  const offsetLabel = surfaceOffsetLabel(sport, surface);

  return (
    <Panel className={className}>
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
        <MapPin className="size-4 text-orange-500" aria-hidden />
        Standort
      </h2>
      <OsmMap lat={lat} lng={lng} />
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <CalendarClock className="size-4 shrink-0 text-orange-500" aria-hidden />
        {formatDay(startTime.slice(0, 10))}, {sessionLabel} Uhr
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {watered && (
          <span className="flex w-fit items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">
            <Droplets className="size-3" aria-hidden />
            gewässert
            <InfoTip label="Hinweis zur Bewässerung" {...wateringEffectTip(surface)} />
          </span>
        )}
        <div className="flex items-stretch gap-1.5">
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-100 py-1 pr-2 pl-1 text-xs font-medium text-slate-600">
            <SurfaceThumb surface={surface} size="tag" />
            <span className="min-w-0 truncate">
              {shortLabelFor(surfacesForSport(sport), surface)}
            </span>
            <InfoTip
              label={`Hinweis zu ${shortLabelFor(surfacesForSport(sport), surface)}`}
              {...surfaceEffectTip(sport, surface)}
            />
            {offsetLabel == null ? (
              <ThermometerSun className="size-3.5 shrink-0 text-amber-600" aria-hidden />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-100 py-1 pr-2 pl-1 text-xs font-medium text-slate-600">
            <ShadowThumb shadow={shadow} size="tag" />
            <span className="min-w-0 truncate">{shortLabelFor(SHADOW_OPTIONS, shadow)}</span>
            <InfoTip
              label={`Hinweis zu ${shortLabelFor(SHADOW_OPTIONS, shadow)}`}
              {...shadowEffectTip(shadow)}
            />
          </span>
        </div>
        <SurfaceNotes sport={sport} surface={surface} size="compact" />
      </div>
    </Panel>
  );
}

function RadarSkeleton() {
  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Panel className="min-h-40 justify-center">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Wetterdaten werden geladen …
          </span>
        </Panel>
        <Panel className="hidden md:flex">
          <span className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <span className="mt-3 h-24 animate-pulse rounded-lg bg-slate-100" />
        </Panel>
        <Panel className="hidden lg:flex">
          <span className="h-40 animate-pulse rounded-lg bg-slate-100" />
        </Panel>
        <Panel className="md:col-span-2 lg:col-span-3">
          <div className="flex h-44 items-end gap-2">
            {[55, 70, 80, 72, 60, 45].map((h, i) => (
              <span
                key={i}
                className="flex-1 animate-pulse rounded-t-lg bg-slate-100"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function RadarError({ message }: { message: string }) {
  return (
    <PageShell>
      <Panel>
        <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="size-6 text-red-600" aria-hidden />
          </span>
          <p className="text-base font-semibold text-slate-900">{message}</p>
          <p className="text-sm text-slate-500">
            Bitte den Check neu starten oder es später erneut versuchen.
          </p>
          <Link
            href="/"
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <RotateCcw className="size-4" aria-hidden />
            Zurück zum Formular
          </Link>
        </div>
      </Panel>
    </PageShell>
  );
}
