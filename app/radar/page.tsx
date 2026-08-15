"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Info,
  Loader2,
  MapPin,
  RotateCcw,
  Share2,
} from "lucide-react";
import {
  AGE_OPTIONS,
  ALL_SURFACE_OPTIONS,
  DEFAULT_AGE,
  DEFAULT_EVENT,
  DEFAULT_SHADOW,
  DEFAULT_SPORT,
  DEFAULT_SURFACE,
  EVENT_OPTIONS,
  labelFor,
  parseOption,
  SHADOW_OPTIONS,
  shortLabelFor,
  SPORT_OPTIONS,
  ageOffsetLabel,
  surfaceForSport,
} from "@/lib/formOptions";
import { BrandHeader } from "@/lib/BrandHeader";
import { DisclaimerBox } from "@/lib/DisclaimerBox";
import { FeedbackSupport } from "@/lib/FeedbackSupport";
import { WBGT_EXPLAINER } from "@/lib/legal";
import { OsmMap } from "@/lib/OsmMap";
import { ShadowThumb, SurfaceThumb } from "@/lib/pitchVisuals";
import {
  calculateWBGTForecast,
  fetchWeatherData,
  findHourIndex,
  getAmpelThresholds,
  getForecastSummary,
  DISPLAY_HOUR_FROM,
  DISPLAY_HOUR_TO,
  GLOBE_DELTA_MAX,
  GLOBE_SOLAR_COEF,
  localHourStamp,
  sessionHourStamps,
  shiftStampByDays,
  SOLAR_DIFFUSE_WEIGHT,
  SOLAR_DIRECT_WEIGHT,
  summarizeSession,
  WATERING_COOLING,
  WBGT_AIR_WEIGHT,
  WBGT_GLOBE_WEIGHT,
  WBGT_WET_BULB_WEIGHT,
  type AgeGroup,
  type ColorCode,
  type EventType,
  type Shadow,
  type Surface,
  type WBGTHour,
} from "@/lib/wbgtCalculator";

// ---------------------------------------------------------------------------
// Farben
// ---------------------------------------------------------------------------

const AMPEL_BG: Record<ColorCode, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  red: "bg-red-600",
};

/** Gelb braucht dunkle Schrift, sonst ist der Kontrast unlesbar. */
const AMPEL_TEXT: Record<ColorCode, string> = {
  green: "text-white",
  yellow: "text-slate-900",
  orange: "text-white",
  red: "text-white",
};

/** Gleiche Farben als Hex – recharts kann keine Tailwind-Klassen. */
const AMPEL_HEX: Record<ColorCode, string> = {
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  red: "#dc2626",
};

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

function isStamp(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

function plusOneHour(stamp: string): string {
  const d = new Date(stamp);
  return Number.isNaN(d.getTime())
    ? stamp
    : localHourStamp(new Date(d.getTime() + HOUR_MS));
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
  const ageGroup = parseOption(searchParams.get("age"), AGE_OPTIONS, DEFAULT_AGE);
  const eventType = parseOption(searchParams.get("event"), EVENT_OPTIONS, DEFAULT_EVENT);
  const surface = surfaceForSport(
    sport,
    parseOption(searchParams.get("surface"), ALL_SURFACE_OPTIONS, DEFAULT_SURFACE)
  );
  const shadow = parseOption(searchParams.get("shadow"), SHADOW_OPTIONS, DEFAULT_SHADOW);
  const watered = searchParams.get("watered") === "true";

  // "2026-08-13T14:30" – fehlt oder unbrauchbar: aktuelle Stunde
  const startRaw = searchParams.get("start");
  const startTime = isStamp(startRaw) ? startRaw : localHourStamp(new Date());

  // Ohne Endzeit (alte Links) gilt die Einheit als eine Stunde lang
  const endRaw = searchParams.get("end");
  const endTime = isStamp(endRaw) && endRaw > startTime ? endRaw : plusOneHour(startTime);

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

      try {
        const data = await fetchWeatherData(lat, lng, false, startTime);

        const { from, to } = sessionHourStamps(startTime, endTime);
        const forecast = calculateWBGTForecast(data, {
          surface,
          shadow,
          watered,
          ageGroup,
          eventType,
          sessionFromIndex: findHourIndex(data, from),
          sessionToIndex: findHourIndex(data, to),
        });

        const hoursAhead = (new Date(startTime).getTime() - Date.now()) / HOUR_MS;

        // Gleicher Zeitraum am Vortag und am Folgetag – lohnt sich das Verschieben?
        const comparison: DayComparison[] = ([-1, 0, 1] as const).map((offset) => {
          const shiftedStart = shiftStampByDays(startTime, offset);
          const shiftedEnd = shiftStampByDays(endTime, offset);
          const result = summarizeSession(data, {
            surface,
            shadow,
            watered,
            ageGroup,
            eventType,
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

        if (!cancelled) setState({ status: "ready", forecast, hoursAhead, comparison });
      } catch (err) {
        console.error("WBGT-Berechnung fehlgeschlagen:", err);
        if (!cancelled) {
          const offline = typeof navigator !== "undefined" && !navigator.onLine;
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

  if (state.status === "loading") return <RadarSkeleton />;
  if (state.status === "error") return <RadarError message={state.message} />;

  // Die Ampel bewertet ausschliesslich die Einheit selbst – die Kontextstunden
  // davor und danach dienen nur der Einordnung und dürfen das Urteil nicht
  // verschärfen.
  const sessionHours = state.forecast.filter((h) => h.inSession);
  const summary = getForecastSummary(sessionHours);
  if (!summary) return <RadarError message="Für diesen Zeitraum liegen keine Daten vor." />;

  const peakHour = sessionHours.reduce((a, b) => (b.wbgtValue > a.wbgtValue ? b : a));
  const thresholds = getAmpelThresholds(ageGroup);
  const sessionLabel = `${startTime.slice(11, 16)}–${endTime.slice(11, 16)}`;
  const confidence = confidenceFor(state.hoursAhead);
  const hasDayCompare = state.comparison.some((d) => d.offset !== 0 && d.maxWbgt !== null);

  const tags = [
    shortLabelFor(SPORT_OPTIONS, sport),
    shortLabelFor(EVENT_OPTIONS, eventType),
    shortLabelFor(AGE_OPTIONS, ageGroup),
  ];

  const chartData = state.forecast.map((hour) => ({
    label: `${hour.timestamp.slice(11, 13)}`,
    wbgt: hour.wbgtValue,
    // vorformatiert, damit LabelList ohne Formatter auskommt
    wbgtLabel: `${hour.wbgtValue.toFixed(1)}°`,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AmpelBox summary={summary} peakHour={peakHour} />

        <ThresholdsBox
          ageGroup={ageGroup}
          eventType={eventType}
          colorCode={summary.colorCode}
          thresholds={thresholds}
        />

        <PlaceBox
          lat={lat}
          lng={lng}
          startTime={startTime}
          sessionLabel={sessionLabel}
          tags={tags}
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

          <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">Verlauf</h2>
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
          <p className="pt-1 text-[11px] text-slate-400">
            Der Rahmen markiert den Zeitraum der Einheit ({sessionLabel} Uhr). Blasse Balken =
            fünf Stunden davor und danach. Angezeigt werden nur Zeiten zwischen{" "}
            {DISPLAY_HOUR_FROM}:00 und {DISPLAY_HOUR_TO}:00 Uhr.
          </p>
        </Panel>

        {hasDayCompare && (
          <Panel className="md:col-span-2 lg:col-span-1">
            <DayCompare days={state.comparison} sessionLabel={sessionLabel} />
          </Panel>
        )}

        <div className="md:col-span-2 lg:col-span-3">
          <Breakdown
            hour={peakHour}
            surface={surface}
            shadow={shadow}
            ageGroup={ageGroup}
            startLabel={peakHour.timestamp.slice(11, 16)}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <ScienceSources />
        </div>

        <Panel className="md:col-span-2 lg:col-span-3">
          <Actions />
          <p className="pt-3 text-center text-sm leading-relaxed text-gray-500">
            WBGT-Näherung auf Basis von Open-Meteo.
          </p>
        </Panel>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <DisclaimerBox />
        <FeedbackSupport pageLabel="Ergebnisseite" />
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
                  {day.maxWbgt.toFixed(1)}°
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
  return `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(1)} °C`;
}

function pct(factor: number): string {
  return `${Math.round(factor * 100)} %`;
}

function watt(value: number): string {
  return `${Math.round(value)} W/m²`;
}

function Breakdown({
  hour,
  surface,
  shadow,
  ageGroup,
  startLabel,
}: {
  hour: WBGTHour;
  surface: Surface;
  shadow: Shadow;
  ageGroup: AgeGroup;
  startLabel: string;
}) {
  const b = hour.breakdown;
  const thresholds = getAmpelThresholds(ageGroup);
  const shadeLabel = shortLabelFor(SHADOW_OPTIONS, shadow);
  const surfaceLabel = labelFor(ALL_SURFACE_OPTIONS, surface);
  const ageLabel = labelFor(AGE_OPTIONS, ageGroup);

  const formula =
    `${WBGT_WET_BULB_WEIGHT}×Tw + ${WBGT_GLOBE_WEIGHT}×Tg + ${WBGT_AIR_WEIGHT}×Ta`;
  const solarFormula = `${SOLAR_DIRECT_WEIGHT}×Gdir + ${SOLAR_DIFFUSE_WEIGHT}×Gdif`;
  const globeFormula = `${GLOBE_SOLAR_COEF}×Solar / (1+Wind), max. ${GLOBE_DELTA_MAX} K`;

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
          <BreakdownRow label="Lufttemperatur Ta" value={`${b.temperature.toFixed(1)} °C`} />
          <BreakdownRow label="Relative Feuchte" value={`${Math.round(b.humidity)} %`} />
          <BreakdownRow label="Wind (10 m)" value={`${b.wind.toFixed(1)} m/s`} />
          <BreakdownRow label="Direktstrahlung Gdir" value={watt(b.directRadiation)} />
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
          hint={`Tw nach Stull (2011) aus Ta und Feuchte. Solarlast ${solarFormula}. Tg = Ta + ${globeFormula}. WBGT = ${formula}.`}
        >
          <BreakdownRow label="Feuchtkugel Tw" value={`${b.wetBulb.toFixed(1)} °C`} />
          <BreakdownRow label="Solarlast ohne Schatten" value={watt(b.solarUnshaded)} />
          <BreakdownRow label="Solarlast mit Schatten" value={watt(b.solarShaded)} />
          <BreakdownRow
            label="Tg-Zuschlag ohne Schatten"
            value={`${b.globeDeltaUnshaded.toFixed(1)} K`}
          />
          <BreakdownRow
            label="Tg-Zuschlag mit Schatten"
            value={`${b.globeDeltaShaded.toFixed(1)} K${
              b.globeDeltaCapped ? ` (auf ${GLOBE_DELTA_MAX} K begrenzt)` : ""
            }`}
          />
          <BreakdownRow label="Schwarzkugel Tg ohne Schatten" value={`${b.globeUnshaded.toFixed(1)} °C`} />
          <BreakdownRow label="Schwarzkugel Tg mit Schatten" value={`${b.globeShaded.toFixed(1)} °C`} />
          <BreakdownRow
            label={`Basis-WBGT volle Sonne (${formula})`}
            value={`${b.baseWbgt.toFixed(1)} °C`}
          />
          <BreakdownRow
            label="Basis-WBGT nach Beschattung"
            value={`${b.shadedWbgt.toFixed(1)} °C`}
          />
          <BreakdownRow
            label="Abzug Strahlung durch Beschattung"
            value={signed(b.shadeRadiationAdjustment)}
          />
        </BreakdownSection>

        <BreakdownSection
          title="4. Platzkorrekturen"
          hint={`Bewässerung: −${WATERING_COOLING.toFixed(1)} °C, nur in der ersten Stunde der Einheit.`}
        >
          <BreakdownRow
            label={`Zuschlag Untergrund (${surfaceLabel})`}
            value={signed(b.surfaceOffset)}
          />
          <BreakdownRow
            label={`× Beschattungsfaktor ${pct(b.shadowFactor)}`}
            value={`${signed(b.effectiveSurfaceOffset)} wirksam`}
          />
          <BreakdownRow
            label="Abzug Untergrund durch Beschattung"
            value={signed(b.shadowAdjustment)}
          />
          <BreakdownRow
            label={
              b.watered
                ? `Abzug Bewässerung (−${WATERING_COOLING.toFixed(1)} °C, 1. Stunde)`
                : "Abzug Bewässerung (nicht gewählt)"
            }
            value={signed(b.wateringOffset)}
          />
        </BreakdownSection>

        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-3 border-t border-gray-200 pt-2">
            <dt className="font-bold text-slate-900">
              Finaler WBGT
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                {b.baseWbgt.toFixed(1)} {signed(b.shadeRadiationAdjustment)}{" "}
                {signed(b.effectiveSurfaceOffset)} {signed(b.wateringOffset)}
              </span>
            </dt>
            <dd className="shrink-0 font-extrabold text-slate-900 tabular-nums">
              {hour.wbgtValue.toFixed(1)} °C
            </dd>
          </div>
        </dl>

        <BreakdownSection
          title={`5. Ampel (${ageLabel})`}
          hint={`FIFA/ACSM-Basis plus Breitensport-Offset ${ageOffsetLabel(
            ageGroup
          )} für diese Altersklasse.`}
        >
          <BreakdownRow label="Schwellen-Offset" value={ageOffsetLabel(ageGroup)} />
          <BreakdownRow label="Grün" value={`< ${thresholds.yellow.toFixed(1)} °C`} />
          <BreakdownRow
            label="Gelb"
            value={`${thresholds.yellow.toFixed(1)} – ${thresholds.orange.toFixed(1)} °C`}
          />
          <BreakdownRow
            label="Orange"
            value={`${thresholds.orange.toFixed(1)} – ${thresholds.red.toFixed(1)} °C`}
          />
          <BreakdownRow label="Rot" value={`> ${thresholds.red.toFixed(1)} °C`} />
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

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 text-slate-600">{label}</dt>
      <dd className="shrink-0 text-right font-semibold text-slate-800 tabular-nums">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wissenschaft & Quellen
// ---------------------------------------------------------------------------

const SOURCE_LINKS = [
  {
    title: "Korey Stringer Institute & NATA",
    href: "https://ksi.uconn.edu/prevention/heat-acclimatization/",
    note: "Strengere WBGT-Auslegung bei fehlender Hitzeakklimatisierung – zentral für den Amateur- und Breitensport.",
  },
  {
    title: "American Academy of Pediatrics – Climatic Heat Stress",
    href: "https://doi.org/10.1542/peds.2021-053127",
    note: "Pädiatrische Thermoregulation: geringere Schweißeffizienz, daher strengere Schwellen für Kinder.",
  },
  {
    title: "Penn State Center for Sports Surface Research",
    href: "https://plantscience.psu.edu/research/centers/ssrc/research/synthetic-turf",
    note: "SBR-Kunstrasen speichert und strahlt deutlich mehr Hitze ab als Naturrasen – Grundlage der Untergrund-Zuschläge.",
  },
] as const;

function ScienceSources() {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-semibold text-slate-700">
        Medizinische Grundlagen & Quellen
        <ChevronDown
          className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="flex flex-col gap-3 border-t border-gray-200 p-3 text-sm leading-relaxed text-slate-600">
        <p>
          Die Ampel startet von den WBGT-Schwellen der FIFA bzw. des ACSM für den
          akklimatisierten Profibereich. SportHitzeCheck warnt absichtlich früher: Im
          Amateursport fehlen medizinische Abteilungen an der Seitenlinie, und die
          Teams sind in der Regel nicht an extreme Hitze akklimatisiert. Deshalb liegt
          auf jeder Altersklasse ein Breitensport-Puffer.
        </p>
        <p>
          Kinder (U13) −1,5 °C wegen geringerer Schweißeffizienz. Jugend (U14–U19)
          −0,8 °C. Aktive −1,0 °C. Ü35 −1,2 °C. Die Offsets
          senken die Schwellen, nicht den Wetter-WBGT selbst – das Ergebnis bleibt eine
          Orientierungshilfe, keine individuelle Diagnose.
        </p>

        <ul className="flex flex-col gap-2.5 text-xs leading-relaxed">
          {SOURCE_LINKS.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-2 transition hover:text-orange-600 hover:decoration-orange-400"
              >
                {source.title}
              </a>
              <span className="mt-0.5 block text-slate-500">{source.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
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
        <BrandHeader compact />
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
}: {
  summary: {
    maxWbgt: number;
    colorCode: ColorCode;
    recommendationLabel: string;
    recommendationPoints: string[];
  };
  peakHour: WBGTHour;
}) {
  const airTemp = peakHour.breakdown.temperature;

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
            {summary.maxWbgt.toFixed(1)}
          </span>
          <span className="inline-flex items-baseline gap-1 text-xl font-bold">
            °C WBGT
            <WbgtInfoTip />
          </span>
        </p>
        <p className="flex items-baseline gap-1.5 pb-1">
          <span className="text-2xl font-extrabold tabular-nums">{airTemp.toFixed(1)}</span>
          <span className="text-sm font-bold opacity-80">°C Luft</span>
        </p>
      </div>
      <p className="mt-3 text-base leading-snug font-bold">{summary.recommendationLabel}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-snug font-medium opacity-90">
        {summary.recommendationPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

function WbgtInfoTip() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex self-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="wbgt-tip"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-5 items-center justify-center rounded-full bg-white/25 text-current transition hover:bg-white/40"
      >
        <Info className="size-3.5" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Was ist WBGT?</span>
      </button>
      {open && (
        <span
          id="wbgt-tip"
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-2 w-64 rounded-lg bg-slate-900 p-3 text-left text-xs leading-relaxed font-medium text-white shadow-lg"
        >
          {WBGT_EXPLAINER}
        </span>
      )}
    </span>
  );
}

const THRESHOLD_STEPS: { code: ColorCode; label: string }[] = [
  { code: "green", label: "Grün" },
  { code: "yellow", label: "Gelb" },
  { code: "orange", label: "Orange" },
  { code: "red", label: "Rot" },
];

function ThresholdsBox({
  ageGroup,
  eventType,
  colorCode,
  thresholds,
}: {
  ageGroup: AgeGroup;
  eventType: EventType;
  colorCode: ColorCode;
  thresholds: { yellow: number; orange: number; red: number };
}) {
  const ranges: Record<ColorCode, string> = {
    green: `< ${thresholds.yellow.toFixed(1)} °C`,
    yellow: `${thresholds.yellow.toFixed(1)} – ${thresholds.orange.toFixed(1)} °C`,
    orange: `${thresholds.orange.toFixed(1)} – ${thresholds.red.toFixed(1)} °C`,
    red: `> ${thresholds.red.toFixed(1)} °C`,
  };

  return (
    <Panel>
      <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
        Grenzwerte
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        {labelFor(AGE_OPTIONS, ageGroup)}
        <span className="text-slate-500"> · Offset {ageOffsetLabel(ageGroup)}</span>
      </p>
      <p className="mt-0.5 text-sm text-slate-600">
        Empfehlung gilt für {labelFor(EVENT_OPTIONS, eventType)}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {THRESHOLD_STEPS.map((step) => {
          const active = step.code === colorCode;
          return (
            <li
              key={step.code}
              className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-sm ${
                active
                  ? "border-slate-400 bg-slate-50 ring-1 ring-slate-400"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${AMPEL_BG[step.code]}`}
                  aria-hidden
                />
                {step.label}
                {active && (
                  <span className="text-[11px] font-medium text-slate-500">aktuell</span>
                )}
              </span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {ranges[step.code]}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function PlaceBox({
  lat,
  lng,
  startTime,
  sessionLabel,
  tags,
  surface,
  shadow,
  watered,
  className = "",
}: {
  lat: number;
  lng: number;
  startTime: string;
  sessionLabel: string;
  tags: string[];
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  className?: string;
}) {
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
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
          {watered && (
            <span className="flex items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">
              <Droplets className="size-3" aria-hidden />
              gewässert
            </span>
          )}
        </div>
        <div className="flex items-stretch gap-1.5">
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-100 py-1 pr-2 pl-1 text-xs font-medium text-slate-600">
            <SurfaceThumb surface={surface} size="tag" />
            <span className="min-w-0 truncate">{shortLabelFor(ALL_SURFACE_OPTIONS, surface)}</span>
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-100 py-1 pr-2 pl-1 text-xs font-medium text-slate-600">
            <ShadowThumb shadow={shadow} size="tag" />
            <span className="min-w-0 truncate">{shortLabelFor(SHADOW_OPTIONS, shadow)}</span>
          </span>
        </div>
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
