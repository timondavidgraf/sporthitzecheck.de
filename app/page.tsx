"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  CloudSun,
  Droplets,
  Gauge,
  Grid2x2,
  Info,
  LocateFixed,
  Loader2,
  MapPin,
  Medal,
  Pencil,
  Search,
  ThermometerSun,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import {
  MAX_SESSION_HOURS,
  type AgeBand,
  type PerformanceLevel,
  type Shadow,
  type Surface,
} from "@/lib/wbgtCalculator";
import { BrandHeader } from "@/lib/BrandHeader";
import { DisclaimerBox } from "@/lib/DisclaimerBox";
import { FeedbackSupport } from "@/lib/FeedbackSupport";
import { OsmMap } from "@/lib/OsmMap";
import { ShadowThumb, SurfaceThumb } from "@/lib/pitchVisuals";
import { InfoTip } from "@/lib/InfoTip";
import { SurfaceNotes } from "@/lib/SurfaceNotes";
import {
  shadowEffectTip,
  surfaceEffectTip,
  wateringEffectTip,
} from "@/lib/pitchTooltips";
import { hasNumericSurfaceOffset, sportAllowsWatering } from "@/lib/sportsConfig";
import { isGoogleQuotaOrOutage, messageForGoogleStatus } from "@/lib/googleStatus";
import {
  DEFAULT_AGE,
  DEFAULT_INTENSITY,
  DEFAULT_PERFORMANCE,
  DEFAULT_SHADOW,
  DEFAULT_SPORT,
  DEFAULT_SURFACE,
  ageOptionsForSport,
  durationForIntensity,
  INTENSITY_OPTIONS,
  isPerformanceLocked,
  parseAgeGroup,
  parseIntensity,
  parseOption,
  parsePerformanceLevel,
  parseSurface,
  PERFORMANCE_OPTIONS,
  populationFieldsHint,
  SHADOW_OPTIONS,
  shadowFactorLabel,
  SPORT_OPTIONS,
  surfaceForSport,
  surfaceOffsetLabel,
  surfacesForSport,
  type IntensityLevel,
  type Sport,
} from "@/lib/formOptions";

// ---------------------------------------------------------------------------
// Formular-State
// ---------------------------------------------------------------------------

interface FormState {
  sport: Sport;
  ageGroup: AgeBand;
  performanceLevel: PerformanceLevel;
  intensity: IntensityLevel;
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  /** Beginn der Einheit als lokaler Stempel ("2026-08-13T14:30") */
  startTime: string;
  /** Ende der Einheit als reine Uhrzeit ("16:00") – immer am Tag des Beginns */
  endTime: string;
  /** Anzeigename des gewählten Ortes (nur UI, wird nicht an /prognose übergeben) */
  locationLabel: string;
  lat: number | null;
  lng: number | null;
}

const STORAGE_KEY = "sporthitzecheck_form";

/** Vorhersage nur für die nächsten 7 Tage – danach nur noch unsichere Trends. */
const MAX_DAYS_AHEAD = 7;

/** Lange Einheiten (z. B. Radtouren) bis 8 Stunden; das Diagramm bleibt lesbar. */
const MAX_DURATION_MIN = MAX_SESSION_HOURS * 60;

/** Zeiten nur in 15-Minuten-Schritten – stündliche Wetterdaten machen genauer sinnlos. */
const QUARTER_MIN = 15;

const pad = (n: number) => String(n).padStart(2, "0");

function minutesToTime(totalMinutes: number): string {
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

function quarterTimes(fromMin: number, toMin: number): string[] {
  const times: string[] = [];
  for (let minutes = fromMin; minutes <= toMin; minutes += QUARTER_MIN) {
    times.push(minutesToTime(minutes));
  }
  return times;
}

const CLOCK_OPTIONS = quarterTimes(0, 23 * 60 + 45);
const DURATION_OPTIONS = quarterTimes(QUARTER_MIN, MAX_DURATION_MIN);

function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toInputValue(date: Date): string {
  return `${toDateValue(date)}T${toTimeValue(date)}`;
}

function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startDatePart(startTime: string): string {
  return startTime.slice(0, 10);
}

function startClockPart(startTime: string): string {
  return startTime.slice(11, 16);
}

/** Rundet Minuten auf das nächste Viertel; bleibt im selben Kalendertag. */
function roundToQuarterMinutes(totalMinutes: number): number {
  const rounded = Math.round(totalMinutes / QUARTER_MIN) * QUARTER_MIN;
  return Math.min(23 * 60 + 45, Math.max(0, rounded));
}

function roundDateToQuarter(date: Date): Date {
  const d = new Date(date);
  const rounded = roundToQuarterMinutes(d.getHours() * 60 + d.getMinutes());
  d.setHours(Math.floor(rounded / 60), rounded % 60, 0, 0);
  return d;
}

function roundStartInput(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return toInputValue(roundDateToQuarter(d));
}

function roundEndInput(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const rounded = roundToQuarterMinutes(h * 60 + m);
  return `${pad(Math.floor(rounded / 60))}:${pad(rounded % 60)}`;
}

/** Untere Grenze: heute – rückwärts liegt keine Vorhersage vor. */
function minStartDate(): string {
  return toDateValue(new Date());
}

function maxStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DAYS_AHEAD);
  return toDateValue(d);
}

/** Endzeit als vollstaendiger Zeitstempel am Tag des Beginns. */
function endStamp(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 10)}T${endTime}`;
}

/**
 * Uhrzeit `minutes` nach `from` – begrenzt auf denselben Tag.
 *
 * Die Endzeit ist eine reine Uhrzeit am Tag des Beginns; ein Training, das um
 * 23:30 startet, darf daher nicht rechnerisch bei 01:00 des Folgetags landen.
 */
function addMinutesSameDay(from: Date, minutes: number): string {
  const target = new Date(from.getTime() + minutes * 60_000);
  if (target.getDate() !== from.getDate()) return "23:45";
  return toTimeValue(roundDateToQuarter(target));
}

/** Dauer in Minuten; negativ, wenn das Ende vor dem Beginn liegt. */
function durationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endStamp(startTime, endTime));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (end.getTime() - start.getTime()) / 60_000;
}

function durationToInput(minutes: number): string {
  const clamped = Math.max(0, roundToQuarterMinutes(minutes));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

function inputToDuration(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return roundToQuarterMinutes(h * 60 + m);
}

function hoursUntil(startTime: string): number {
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return 0;
  return (start.getTime() - Date.now()) / 3_600_000;
}

const DEFAULT_FORM: FormState = {
  sport: DEFAULT_SPORT,
  ageGroup: DEFAULT_AGE,
  performanceLevel: DEFAULT_PERFORMANCE,
  intensity: DEFAULT_INTENSITY,
  surface: DEFAULT_SURFACE,
  shadow: DEFAULT_SHADOW,
  watered: false,
  startTime: "",
  endTime: "",
  locationLabel: "",
  lat: null,
  lng: null,
};

// ---------------------------------------------------------------------------
// Geocoding (Google Maps)
// ---------------------------------------------------------------------------

const GOOGLE_NOT_FOUND = messageForGoogleStatus("ZERO_RESULTS");
const MAX_PLACE_QUERY = 120;

interface GooglePlace {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

interface GoogleMapsResponse {
  status: string;
  results?: GooglePlace[];
}

/** Name des Vereins/POI, sonst die formatierte Adresse aus der Google-Antwort. */
function buildLocationLabel(place: GooglePlace | undefined, fallback: string): string {
  const name = place?.name?.trim();
  const address = place?.formatted_address?.trim();
  if (name && address && !address.includes(name)) return `${name}, ${address}`;
  return name || address || fallback;
}

function coordsFromPlace(place: GooglePlace | undefined): { lat: number; lng: number } | null {
  const lat = place?.geometry?.location?.lat;
  const lng = place?.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

type LookupResult =
  | { ok: true; results: GooglePlace[] }
  | { ok: false; status: string };

async function lookupPlaces(q: string, signal?: AbortSignal): Promise<LookupResult> {
  let res: Response;
  try {
    res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal });
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      throw err;
    }
    return { ok: false, status: "lookup-failed" };
  }

  // Der Proxy antwortet bei Limit oder Fehler mit passendem HTTP-Status und
  // trotzdem mit JSON – deshalb erst den Body lesen, damit die konkrete
  // Meldung (z. B. Rate-Limit) bei den Nutzer:innen ankommt.
  const data = (await res.json().catch(() => null)) as GoogleMapsResponse | null;
  if (!data) return { ok: false, status: "lookup-failed" };
  const status = typeof data.status === "string" ? data.status : "UNKNOWN_ERROR";
  if (status !== "OK" || !data.results?.length) {
    return { ok: false, status: status === "OK" ? "ZERO_RESULTS" : status };
  }
  return { ok: true, results: data.results };
}

function isStartStamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

function isClock(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

/**
 * Gespeicherte Uhrzeit und Dauer behalten. Nur das Datum rücken wir nach vorn,
 * wenn es in der Vergangenheit liegt – rückwärts gibt es keine Vorhersage.
 */
function restoredSchedule(
  saved: Pick<FormState, "startTime" | "endTime" | "sport" | "intensity">
): Pick<FormState, "startTime" | "endTime"> {
  const now = roundDateToQuarter(new Date());
  const fallbackDuration = durationForIntensity(saved.sport, saved.intensity);
  const savedDuration = durationMinutes(saved.startTime, saved.endTime);
  const duration = savedDuration > 0 ? savedDuration : fallbackDuration;

  if (!isStartStamp(saved.startTime)) {
    return {
      startTime: toInputValue(now),
      endTime: addMinutesSameDay(now, duration),
    };
  }

  let date = startDatePart(saved.startTime);
  const today = toDateValue(now);
  const latest = maxStartDate();
  if (date < today) date = today;
  if (date > latest) date = latest;

  const clock = startClockPart(saved.startTime) || toTimeValue(now);
  const startTime = `${date}T${clock}`;
  return {
    startTime,
    endTime: addMinutesSameDay(new Date(startTime), duration),
  };
}

/**
 * Nimmt nur bekannte Werte aus dem localStorage an, damit alte Einträge nichts
 * kaputt machen.
 */
function sanitize(raw: unknown): FormState {
  if (typeof raw !== "object" || raw === null) return DEFAULT_FORM;
  const v = raw as Partial<FormState>;

  const sport = parseOption(v.sport, SPORT_OPTIONS, DEFAULT_FORM.sport);
  const ageGroup = parseAgeGroup(v.ageGroup);

  return {
    sport,
    ageGroup,
    performanceLevel: parsePerformanceLevel(v.performanceLevel, ageGroup),
    intensity: parseIntensity(v.intensity),
    surface: parseSurface(v.surface, sport),
    shadow: parseOption(v.shadow, SHADOW_OPTIONS, DEFAULT_FORM.shadow),
    watered: typeof v.watered === "boolean" ? v.watered : DEFAULT_FORM.watered,
    startTime: isStartStamp(v.startTime) ? v.startTime : "",
    endTime: isClock(v.endTime) ? v.endTime : "",
    locationLabel:
      typeof v.locationLabel === "string" ? v.locationLabel : DEFAULT_FORM.locationLabel,
    lat: typeof v.lat === "number" && Number.isFinite(v.lat) ? v.lat : null,
    lng: typeof v.lng === "number" && Number.isFinite(v.lng) ? v.lng : null,
  };
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [hydrated, setHydrated] = useState(false);

  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<GooglePlace[]>([]);
  const [editingLocation, setEditingLocation] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Beim Mount: letzte Eingaben wiederherstellen. Bewusst im Effect – der
  // Server kennt weder localStorage noch die lokale Uhrzeit.
  useEffect(() => {
    let restored = DEFAULT_FORM;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) restored = sanitize(JSON.parse(raw));
    } catch {
      // Defekter Eintrag oder Storage gesperrt – Defaults bleiben stehen
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Nachladen nach der Hydration
    setForm({
      ...restored,
      ...restoredSchedule(restored),
    });
    setHydrated(true);
  }, []);

  // Bei jeder Änderung persistieren (erst nachdem geladen wurde, sonst
  // überschreiben die Defaults sofort den gespeicherten Stand)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Quota voll oder Private Mode – Formular funktioniert trotzdem
    }
  }, [form, hydrated]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * Beginn verschieben – die Dauer bleibt erhalten. Wer das Training von 16 auf
   * 18 Uhr verlegt, will nicht auch noch die Endzeit nachziehen müssen.
   */
  const changeStart = (raw: string) =>
    setForm((prev) => {
      const startTime = roundStartInput(raw);
      const minutes = durationMinutes(prev.startTime, prev.endTime);
      const start = new Date(startTime);

      if (minutes <= 0 || Number.isNaN(start.getTime())) return { ...prev, startTime };
      return { ...prev, startTime, endTime: addMinutesSameDay(start, minutes) };
    });

  const changeDate = (date: string) => {
    const clock = startClockPart(form.startTime) || "00:00";
    if (!date) return;
    changeStart(`${date}T${clock}`);
  };

  const changeStartClock = (clock: string) => {
    const date = startDatePart(form.startTime);
    if (!date || !clock) return;
    changeStart(`${date}T${clock}`);
  };

  const changeEnd = (raw: string) =>
    setForm((prev) => {
      const endTime = roundEndInput(raw);
      const start = new Date(prev.startTime);
      if (Number.isNaN(start.getTime())) return { ...prev, endTime };

      const minutes = durationMinutes(prev.startTime, endTime);
      if (minutes > MAX_DURATION_MIN) {
        return { ...prev, endTime: addMinutesSameDay(start, MAX_DURATION_MIN) };
      }
      return { ...prev, endTime };
    });

  const changeDuration = (raw: string) =>
    setForm((prev) => {
      const start = new Date(prev.startTime);
      if (Number.isNaN(start.getTime())) return prev;

      let minutes = inputToDuration(raw);
      if (minutes < QUARTER_MIN) minutes = QUARTER_MIN;
      if (minutes > MAX_DURATION_MIN) minutes = MAX_DURATION_MIN;
      return { ...prev, endTime: addMinutesSameDay(start, minutes) };
    });

  /** Sportart wechseln – der Untergrund muss zur neuen Auswahl passen. */
  const changeSport = (sport: Sport) =>
    setForm((prev) => ({
      ...prev,
      sport,
      surface: surfaceForSport(sport, prev.surface),
      watered: sportAllowsWatering(sport) ? prev.watered : false,
    }));

  const changeAge = (ageGroup: AgeBand) =>
    setForm((prev) => ({
      ...prev,
      ageGroup,
      performanceLevel: isPerformanceLocked(ageGroup)
        ? "recreational"
        : prev.performanceLevel,
    }));

  const changeIntensity = (intensity: IntensityLevel) =>
    setForm((prev) => ({ ...prev, intensity }));

  // --- Geolocation ---------------------------------------------------------

  const useCurrentLocation = () => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Dieser Browser unterstützt keine Standortabfrage.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          locationLabel: `Standort (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
        }));
        setQuery("");
        setEditingLocation(false);
        setIsLocating(false);
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Standortzugriff wurde abgelehnt. Bitte Adresse manuell suchen."
            : err.code === err.TIMEOUT
              ? "Die Standortabfrage hat zu lange gedauert. Bitte Adresse manuell suchen."
              : "Standort konnte nicht ermittelt werden. Bitte Adresse manuell suchen.";
        setError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  // --- Ortssuche (Google Maps) ---------------------------------------------

  const applyPlace = (place: GooglePlace, fallback: string) => {
    const coords = coordsFromPlace(place);
    if (!coords) {
      setError(GOOGLE_NOT_FOUND);
      return false;
    }

    const locationLabel = buildLocationLabel(place, fallback);
    setForm((prev) => ({ ...prev, ...coords, locationLabel }));
    setQuery("");
    setSuggestions([]);
    setEditingLocation(false);
    setError(null);
    return true;
  };

  const searchAddress = async () => {
    const q = query.trim().slice(0, MAX_PLACE_QUERY);
    if (!q) {
      setError(messageForGoogleStatus("INVALID_REQUEST"));
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      const result = await lookupPlaces(q);
      if (!result.ok) {
        setSuggestions([]);
        setError(messageForGoogleStatus(result.status));
        return;
      }
      applyPlace(result.results[0], q);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSuggestions([]);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setError(
        offline
          ? "Keine Internetverbindung. Bitte Verbindung prüfen oder den aktuellen Standort nutzen."
          : messageForGoogleStatus("UNKNOWN_ERROR")
      );
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const q = query.trim().slice(0, MAX_PLACE_QUERY);
    // Kein Aufräumen des States hier: ob die Liste sichtbar ist, wird beim
    // Rendern aus `showSuggestions` abgeleitet. Ein setState im Effekt-Körper
    // würde nur eine zusätzliche Renderrunde auslösen.
    if (!editingLocation && form.lat !== null) return;
    if (q.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await lookupPlaces(q, controller.signal);
          if (controller.signal.aborted) return;
          if (!result.ok) {
            setSuggestions([]);
            if (isGoogleQuotaOrOutage(result.status)) {
              setError(messageForGoogleStatus(result.status));
            }
            return;
          }
          setSuggestions(result.results.slice(0, 5));
        } catch (err) {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setSuggestions([]);
          const offline = typeof navigator !== "undefined" && !navigator.onLine;
          setError(
            offline
              ? "Keine Internetverbindung. Bitte Verbindung prüfen oder den aktuellen Standort nutzen."
              : messageForGoogleStatus("UNKNOWN_ERROR")
          );
        }
      })();
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, editingLocation, form.lat]);

  // --- Submit --------------------------------------------------------------

  const hasLocation = form.lat !== null && form.lng !== null;

  /**
   * Die Vorschlagsliste wird beim Rendern ein- und ausgeblendet statt beim
   * Tippen geleert: Ein bereits bestätigter Ort blendet sie aus, und unter drei
   * Zeichen gibt es ohnehin keine Suche.
   */
  const showSuggestions =
    (editingLocation || form.lat === null) && query.trim().length >= 3;
  const visibleSuggestions = showSuggestions ? suggestions : [];

  const duration = durationMinutes(form.startTime, form.endTime);
  const timeError =
    !hydrated || !form.startTime || !form.endTime
      ? null
      : duration <= 0
        ? "Das Ende muss nach dem Beginn liegen."
        : duration > MAX_DURATION_MIN
          ? `Bitte höchstens ${MAX_DURATION_MIN / 60} Stunden am Stück planen.`
          : null;

  const hasTime = Boolean(form.startTime && form.endTime);
  const canSubmit = hasLocation && !timeError && hasTime;
  const hoursAhead = hoursUntil(form.startTime);

  const submitError = !submitAttempted
    ? null
    : !hasLocation && !hasTime
      ? "Bitte Standort und Zeitraum angeben."
      : !hasLocation
        ? "Bitte zuerst einen Standort wählen."
        : timeError
          ? timeError
          : !hasTime
            ? "Bitte Beginn und Ende der Einheit angeben."
            : null;

  const startCheck = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;

    // 3 Nachkommastellen (~100 m) reichen: das Wettermodell rechnet im
    // Kilometerraster, und geteilte Links verraten so keinen genauen Standort.
    const params = new URLSearchParams({
      lat: form.lat!.toFixed(3),
      lng: form.lng!.toFixed(3),
      sport: form.sport,
      age: form.ageGroup,
      level: isPerformanceLocked(form.ageGroup)
        ? "recreational"
        : form.performanceLevel,
      intensity: form.intensity,
      surface: form.surface,
      shadow: form.shadow,
      watered: String(sportAllowsWatering(form.sport) && form.watered),
      start: form.startTime,
      end: endStamp(form.startTime, form.endTime),
    });

    router.push(`/prognose?${params.toString()}`);
  };

  // --- UI ------------------------------------------------------------------

  const surfaceOptions = surfacesForSport(form.sport);
  const shadowAffectsSurfaceOffset = hasNumericSurfaceOffset(form.sport, form.surface);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 lg:max-w-6xl">
      <BrandHeader asH1 />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Info className="size-4 text-orange-500" aria-hidden />
          Temperatur ≠ Hitzebelastung
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Die Lufttemperatur sagt nicht, wie belastend Training oder Spiel wirklich
          sind. Schwüle, Sonne, Wind und ein heißer Belag ändern die Belastung stark –
          oft bei derselben Gradzahl. SportHitzeCheck schätzt den WBGT für euren Ort
          und Zeitraum und zeigt eine Ampel mit Handlungsempfehlungen.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* --- Standort --- */}
      <Card className={submitAttempted && !hasLocation ? "border-red-400 ring-1 ring-red-400" : ""}>
        <SectionTitle icon={<MapPin className="size-4" />} title="Standort" />

        {hasLocation && !editingLocation ? (
          <div className="mt-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                <Check className="size-4 shrink-0" aria-hidden />
                Standort gespeichert
              </p>
              <p className="mt-1.5 text-sm leading-snug text-emerald-800">{form.locationLabel}</p>
              <button
                type="button"
                onClick={() => {
                  setEditingLocation(true);
                  setQuery("");
                  setSuggestions([]);
                  setError(null);
                  window.setTimeout(() => addressInputRef.current?.focus(), 0);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
              >
                <Pencil className="size-3.5" aria-hidden />
                Anderen Standort wählen
              </button>
            </div>
            {form.lat !== null && form.lng !== null && (
              <OsmMap lat={form.lat} lng={form.lng} />
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isLocating}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <LocateFixed className="size-5" aria-hidden />
              )}
              Aktuellen Standort nutzen
            </button>

            <div className="my-3 flex items-center gap-3 text-xs font-medium text-slate-400">
              <span className="h-px flex-1 bg-gray-200" />
              oder Vereinsname/Adresse anpassen
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <label htmlFor="address" className="sr-only">
              Vereinsname oder Adresse suchen
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={addressInputRef}
                  id="address"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (visibleSuggestions[0]) {
                        applyPlace(visibleSuggestions[0], query.trim());
                      } else {
                        void searchAddress();
                      }
                    }
                    if (e.key === "Escape") {
                      setSuggestions([]);
                      if (hasLocation) setEditingLocation(false);
                    }
                  }}
                  placeholder="z. B. SV Musterstadt oder Straße, Ort"
                  autoComplete="off"
                  maxLength={MAX_PLACE_QUERY}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-base outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  onClick={() => void searchAddress()}
                  disabled={isSearching || !query.trim()}
                  aria-label="Ort suchen"
                  className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition hover:bg-orange-600 active:scale-95 disabled:opacity-40"
                >
                  {isSearching ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : (
                    <Search className="size-5" aria-hidden />
                  )}
                </button>
              </div>

              {visibleSuggestions.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Ort-Vorschläge"
                  className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  {visibleSuggestions.map((place, index) => {
                    const label = buildLocationLabel(place, query.trim());
                    return (
                      <li key={`${label}-${index}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => applyPlace(place, query.trim())}
                          className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:bg-orange-50"
                        >
                          <MapPin className="mt-0.5 size-4 shrink-0 text-orange-500" aria-hidden />
                          <span className="min-w-0">
                            {place.name && (
                              <span className="block font-semibold text-slate-900">{place.name}</span>
                            )}
                            <span className="block text-slate-500">
                              {place.formatted_address ?? label}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Vereinsnamen eingeben und einen Vorschlag antippen – erst dann ist der Standort
              gespeichert.
            </p>

            {hasLocation && (
              <p className="mt-2 text-xs text-slate-400">
                Aktuell gespeichert: {form.locationLabel}
              </p>
            )}
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0">{error}</span>
          </p>
        )}

        {submitAttempted && !hasLocation && !error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Bitte einen Standort wählen oder suchen.</span>
          </p>
        )}
      </Card>

      {/* --- Sport & Team --- */}
      <Card>
        <SectionTitle icon={<Trophy className="size-4" />} title="Sport & Team" />

        <div className="mt-3 flex flex-col gap-4">
          <SelectField
            id="sport"
            label="Sportart"
            icon={<Medal className="size-4" />}
            value={form.sport}
            options={SPORT_OPTIONS}
            onChange={changeSport}
          />
          <SelectField
            id="age"
            label="Altersklasse"
            icon={<Users className="size-4" />}
            value={form.ageGroup}
            options={ageOptionsForSport(form.sport)}
            hint={populationFieldsHint(form.sport)}
            onChange={changeAge}
          />
          <SelectField
            id="level"
            label="Leistungsstufe"
            icon={<Award className="size-4" />}
            value={
              isPerformanceLocked(form.ageGroup)
                ? "recreational"
                : form.performanceLevel
            }
            options={PERFORMANCE_OPTIONS}
            disabled={isPerformanceLocked(form.ageGroup)}
            onChange={(v) => update("performanceLevel", v)}
          />
          <SelectField
            id="intensity"
            label="Intensität"
            icon={<Gauge className="size-4" />}
            value={form.intensity}
            options={INTENSITY_OPTIONS}
            onChange={changeIntensity}
          />
        </div>
      </Card>

      {/* --- Zeitpunkt --- */}
      <Card className={submitAttempted && (!hasTime || Boolean(timeError)) ? "border-red-400 ring-1 ring-red-400" : ""}>
        <SectionTitle icon={<CalendarClock className="size-4" />} title="Zeitpunkt" />

        <div className="mt-3 flex flex-col gap-4">
          <FormField id="date" label="Datum" icon={<Calendar className="size-4" />}>
            <input
              id="date"
              type="date"
              value={startDatePart(form.startTime)}
              min={hydrated ? minStartDate() : undefined}
              max={hydrated ? maxStartDate() : undefined}
              onChange={(e) => changeDate(e.target.value)}
              className={CONTROL_CLASS}
            />
          </FormField>

          <FormField id="start" label="Beginn" icon={<Clock className="size-4" />}>
            <TimeSelect
              id="start"
              value={startClockPart(form.startTime)}
              options={CLOCK_OPTIONS}
              onChange={changeStartClock}
            />
          </FormField>

          <FormField id="end" label="Ende" icon={<Clock className="size-4" />}>
            <TimeSelect
              id="end"
              value={form.endTime}
              options={CLOCK_OPTIONS}
              onChange={changeEnd}
            />
          </FormField>

          <FormField id="duration" label="Dauer" icon={<Timer className="size-4" />}>
            <TimeSelect
              id="duration"
              value={durationToInput(Math.max(QUARTER_MIN, duration))}
              options={DURATION_OPTIONS}
              onChange={changeDuration}
            />
          </FormField>

          {timeError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{timeError}</span>
            </p>
          ) : submitAttempted && !hasTime ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Bitte Beginn und Ende der Einheit angeben.</span>
            </p>
          ) : hoursAhead > 72 ? (
            <p className="flex items-start gap-1.5 text-xs text-orange-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Trendprognose. Verlässlich erst 3 Tage im Voraus.
            </p>
          ) : hoursAhead >= 48 ? (
            <p className="text-xs text-slate-500">
              Gute Zuverlässigkeit, leichte Schwankungen möglich.
            </p>
          ) : null}
        </div>
      </Card>

      {/* --- Platz --- */}
      <Card className="md:col-span-2 lg:col-span-3">
        <SectionTitle icon={<Grid2x2 className="size-4" />} title="Platzbedingungen" />

        <div className="mt-3 flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
          <fieldset>
            <legend className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Grid2x2 className="size-4 text-slate-400" aria-hidden />
              Untergrund
            </legend>

            <div className="mt-1.5 flex flex-col gap-2">
              {surfaceOptions.map((option) => {
                const offsetLabel = surfaceOffsetLabel(form.sport, option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition has-checked:border-orange-500 has-checked:bg-orange-50"
                  >
                    <input
                      type="radio"
                      name="surface"
                      value={option.value}
                      checked={form.surface === option.value}
                      onChange={() => update("surface", option.value)}
                      className="sr-only"
                    />
                    <SurfaceThumb surface={option.value} />
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                      {option.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <InfoTip
                        label={`Hinweis zu ${option.label}`}
                        {...surfaceEffectTip(form.sport, option.value)}
                      />
                      {offsetLabel == null ? (
                        <ThermometerSun
                          className="size-4 text-amber-600"
                          aria-label="Kein Zahlen-Offset, Oberflächenhinweis"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 tabular-nums">
                          {offsetLabel}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <CloudSun className="size-4 text-slate-400" aria-hidden />
              Beschattung
            </legend>

            <div className="mt-1.5 flex flex-col gap-2">
              {SHADOW_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition has-checked:border-orange-500 has-checked:bg-orange-50"
                >
                  <input
                    type="radio"
                    name="shadow"
                    value={option.value}
                    checked={form.shadow === option.value}
                    onChange={() => update("shadow", option.value)}
                    className="sr-only"
                  />
                  <ShadowThumb shadow={option.value} />
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                    {option.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 tabular-nums">
                      {shadowFactorLabel(option.value)}
                    </span>
                    <InfoTip
                      label={`Hinweis zu ${option.label}`}
                      {...shadowEffectTip(option.value)}
                    />
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Näherung: Anteil der Direktstrahlung, der den Platz noch erreicht. Wirkt
              immer auf den WBGT über die Strahlung
              {shadowAffectsSurfaceOffset
                ? " und auf den Untergrund-Zuschlag."
                : ". Der gewählte Untergrund hat keinen Zahlen-Zuschlag – Beschattung ändert ihn numerisch nicht."}{" "}
              Der tatsächliche Schatten kann sich während der Einheit mit Sonnenstand und
              Bewölkung ändern.
            </p>
          </fieldset>

          <SurfaceNotes sport={form.sport} surface={form.surface} />

          {sportAllowsWatering(form.sport) ? (
          <label
            htmlFor="watered"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3.5 transition has-checked:border-sky-400 has-checked:bg-sky-50 lg:col-span-2"
          >
            <input
              id="watered"
              type="checkbox"
              checked={form.watered}
              onChange={(e) => update("watered", e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-sky-600"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Droplets className="size-4 text-sky-600" aria-hidden />
                Platz wird kurz vorher gewässert
                <InfoTip
                  label="Hinweis zur Bewässerung"
                  {...wateringEffectTip(form.surface)}
                />
              </span>
            </span>
          </label>
          ) : null}
        </div>
      </Card>
      </div>

      {/* --- Submit --- */}
      <DisclaimerBox />
      <button
        type="button"
        onClick={startCheck}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-4 text-lg font-extrabold tracking-tight text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.99] lg:mx-auto lg:max-w-md"
      >
        SportHitzeCheck starten
        <ArrowRight className="size-5" aria-hidden />
      </button>

      {submitError && (
        <p
          role="alert"
          className="flex items-start justify-center gap-2 text-center text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{submitError}</span>
        </p>
      )}

      <FeedbackSupport />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function Card({
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

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="flex h-5 items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
      <span className="text-orange-500">{icon}</span>
      {title}
    </h2>
  );
}

const CONTROL_CLASS =
  "box-border h-12 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-base leading-none outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

function FormField({
  id,
  label,
  icon,
  disabled = false,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={disabled ? "cursor-not-allowed opacity-50" : undefined}>
      <label
        htmlFor={id}
        className="flex h-5 items-center gap-1.5 text-sm leading-none font-semibold text-slate-700"
      >
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      <div className="relative mt-1.5">{children}</div>
    </div>
  );
}

function TimeSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const choices = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL_CLASS} appearance-none pr-10`}
      >
        {choices.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </>
  );
}

function SelectField<T extends string>({
  id,
  label,
  icon,
  hint,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <FormField id={id} label={label} icon={icon} disabled={disabled}>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as T)}
          className={`${CONTROL_CLASS} appearance-none pr-10 disabled:cursor-not-allowed`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
      {hint && <p className="mt-1 text-xs leading-snug text-slate-500">{hint}</p>}
    </FormField>
  );
}
