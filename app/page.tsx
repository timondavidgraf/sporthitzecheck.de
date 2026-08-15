"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  CloudSun,
  Droplets,
  Flag,
  Grid2x2,
  LocateFixed,
  Loader2,
  MapPin,
  Pencil,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import type { AgeGroup, EventType, Shadow, Surface } from "@/lib/wbgtCalculator";
import { BrandHeader } from "@/lib/BrandHeader";
import { DisclaimerBox } from "@/lib/DisclaimerBox";
import { FeedbackSupport } from "@/lib/FeedbackSupport";
import { OsmMap } from "@/lib/OsmMap";
import { ShadowThumb, SurfaceThumb } from "@/lib/pitchVisuals";
import { isGoogleQuotaOrOutage, messageForGoogleStatus } from "@/lib/googleStatus";
import {
  AGE_OPTIONS,
  ALL_SURFACE_OPTIONS,
  DEFAULT_AGE,
  DEFAULT_EVENT,
  DEFAULT_SHADOW,
  DEFAULT_SPORT,
  DEFAULT_SURFACE,
  EVENT_OPTIONS,
  durationForEvent,
  parseOption,
  SHADOW_OPTIONS,
  shadowFactorLabel,
  SPORT_OPTIONS,
  surfaceForSport,
  surfaceOffsetLabel,
  surfacesForSport,
  type Sport,
} from "@/lib/formOptions";

// ---------------------------------------------------------------------------
// Formular-State
// ---------------------------------------------------------------------------

interface FormState {
  sport: Sport;
  ageGroup: AgeGroup;
  eventType: EventType;
  surface: Surface;
  shadow: Shadow;
  watered: boolean;
  /** Beginn der Einheit im Format eines `datetime-local`-Inputs ("2026-08-13T14:30") */
  startTime: string;
  /** Ende der Einheit als reine Uhrzeit ("16:00") – immer am Tag des Beginns */
  endTime: string;
  /** Anzeigename des gewählten Ortes (nur UI, wird nicht an /radar übergeben) */
  locationLabel: string;
  lat: number | null;
  lng: number | null;
}

const STORAGE_KEY = "sporthitzecheck_form";

/** Vorhersage nur für die nächsten 7 Tage – danach nur noch unsichere Trends. */
const MAX_DAYS_AHEAD = 7;

/** Laenger als das ist keine Trainingseinheit mehr – und das Diagramm unlesbar. */
const MAX_DURATION_MIN = 6 * 60;

/** Zeiten nur in 15-Minuten-Schritten – stündliche Wetterdaten machen genauer sinnlos. */
const QUARTER_MIN = 15;
const TIME_STEP_SECONDS = QUARTER_MIN * 60;

const pad = (n: number) => String(n).padStart(2, "0");

function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

/** Untere Grenze: heute 00:00 – rückwärts liegt keine Vorhersage vor. */
function minStartTime(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toInputValue(d);
}

function maxStartTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DAYS_AHEAD);
  return toInputValue(d);
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
  eventType: DEFAULT_EVENT,
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
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) return { ok: false, status: "lookup-failed" };

  const data = (await res.json()) as GoogleMapsResponse;
  const status = typeof data.status === "string" ? data.status : "UNKNOWN_ERROR";
  if (status !== "OK" || !data.results?.length) {
    return { ok: false, status: status === "OK" ? "ZERO_RESULTS" : status };
  }
  return { ok: true, results: data.results };
}

/**
 * Nimmt nur bekannte Werte aus dem localStorage an, damit alte Einträge nichts
 * kaputt machen. Der Startzeitpunkt wird bewusst NICHT übernommen – ein
 * gespeicherter Zeitpunkt läge beim nächsten Besuch in der Vergangenheit.
 */
function sanitize(raw: unknown): FormState {
  if (typeof raw !== "object" || raw === null) return DEFAULT_FORM;
  const v = raw as Partial<FormState>;

  const sport = parseOption(v.sport, SPORT_OPTIONS, DEFAULT_FORM.sport);
  const surface = parseOption(v.surface, ALL_SURFACE_OPTIONS, DEFAULT_FORM.surface);

  return {
    sport,
    ageGroup: parseOption(v.ageGroup, AGE_OPTIONS, DEFAULT_FORM.ageGroup),
    eventType: parseOption(v.eventType, EVENT_OPTIONS, DEFAULT_FORM.eventType),
    // Untergrund muss zur Sportart passen (z.B. altes "turf_black" bei Tennis)
    surface: surfaceForSport(sport, surface),
    shadow: parseOption(v.shadow, SHADOW_OPTIONS, DEFAULT_FORM.shadow),
    watered: typeof v.watered === "boolean" ? v.watered : DEFAULT_FORM.watered,
    startTime: "",
    endTime: "",
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

  // Beim Mount: letzte Eingaben wiederherstellen und Startzeit auf jetzt setzen.
  // Bewusst im Effect und nicht als useState-Initializer – der Server kennt
  // weder localStorage noch die lokale Uhrzeit, ein direkter Initialwert würde
  // zu einem Hydration-Mismatch führen.
  useEffect(() => {
    let restored = DEFAULT_FORM;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) restored = sanitize(JSON.parse(raw));
    } catch {
      // Defekter Eintrag oder Storage gesperrt – Defaults bleiben stehen
    }

    const start = roundDateToQuarter(new Date());

    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Nachladen nach der Hydration
    setForm({
      ...restored,
      startTime: toInputValue(start),
      endTime: addMinutesSameDay(start, durationForEvent(restored.eventType)),
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
    setForm((prev) => ({ ...prev, sport, surface: surfaceForSport(sport, prev.surface) }));

  /** Ereignis wechseln – die Standarddauer der neuen Art übernehmen. */
  const changeEvent = (eventType: EventType) =>
    setForm((prev) => {
      const start = new Date(prev.startTime);
      if (Number.isNaN(start.getTime())) return { ...prev, eventType };
      return {
        ...prev,
        eventType,
        endTime: addMinutesSameDay(start, durationForEvent(eventType)),
      };
    });

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
          locationLabel: `Aktueller Standort (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
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
    if (!editingLocation && form.lat !== null) {
      setSuggestions([]);
      return;
    }
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

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

    const params = new URLSearchParams({
      lat: form.lat!.toFixed(4),
      lng: form.lng!.toFixed(4),
      sport: form.sport,
      age: form.ageGroup,
      event: form.eventType,
      surface: form.surface,
      shadow: form.shadow,
      watered: String(form.watered),
      start: form.startTime,
      end: endStamp(form.startTime, form.endTime),
    });

    router.push(`/radar?${params.toString()}`);
  };

  // --- UI ------------------------------------------------------------------

  const surfaceOptions = surfacesForSport(form.sport);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 lg:max-w-6xl">
      <BrandHeader />

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
              oder Vereinsname
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
                      if (suggestions[0]) {
                        applyPlace(suggestions[0], query.trim());
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

              {suggestions.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Ort-Vorschläge"
                  className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  {suggestions.map((place, index) => {
                    const label = buildLocationLabel(place, query.trim());
                    return (
                      <li key={`${label}-${index}`}>
                        <button
                          type="button"
                          role="option"
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
                Bisher gespeichert: {form.locationLabel}
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
            icon={<Trophy className="size-4" />}
            value={form.sport}
            options={SPORT_OPTIONS}
            onChange={changeSport}
          />
          <SelectField
            id="age"
            label="Altersklasse"
            icon={<Users className="size-4" />}
            hint="Schwellen strenger als FIFA-Profi-Richtlinien (Breitensport-Puffer)."
            value={form.ageGroup}
            options={AGE_OPTIONS}
            onChange={(v) => update("ageGroup", v)}
          />
          <SelectField
            id="event"
            label="Ereignis"
            icon={<Flag className="size-4" />}
            hint="Die Handlungsempfehlung richtet sich nach der Art der Belastung."
            value={form.eventType}
            options={EVENT_OPTIONS}
            onChange={changeEvent}
          />
        </div>
      </Card>

      {/* --- Zeitpunkt --- */}
      <Card className={submitAttempted && (!hasTime || Boolean(timeError)) ? "border-red-400 ring-1 ring-red-400" : ""}>
        <SectionTitle icon={<CalendarClock className="size-4" />} title="Zeitpunkt" />

        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label htmlFor="start" className="text-sm font-semibold text-slate-700">
              Beginn von Training / Spiel
            </label>
            <input
              id="start"
              type="datetime-local"
              step={TIME_STEP_SECONDS}
              value={form.startTime}
              min={hydrated ? minStartTime() : undefined}
              max={hydrated ? maxStartTime() : undefined}
              onChange={(e) => changeStart(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label htmlFor="end" className="text-sm font-semibold text-slate-700">
              Ende
            </label>
            <input
              id="end"
              type="time"
              step={TIME_STEP_SECONDS}
              value={form.endTime}
              onChange={(e) => changeEnd(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label htmlFor="duration" className="text-sm font-semibold text-slate-700">
              Dauer
            </label>
            <input
              id="duration"
              type="time"
              step={TIME_STEP_SECONDS}
              min="00:15"
              max="06:00"
              value={durationToInput(Math.max(0, duration))}
              onChange={(e) => changeDuration(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

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
              {surfaceOptions.map((option) => (
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
                  <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                    {surfaceOffsetLabel(option.value)}
                  </span>
                </label>
              ))}
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
                  <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                    {shadowFactorLabel(option.value)}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Näherung: Anteil der Direktstrahlung, der den Platz noch erreicht. Wirkt auf
              den WBGT und den Untergrund-Zuschlag. Der tatsächliche Schatten kann sich
              während der Einheit mit Sonnenstand und Bewölkung ändern.
            </p>
          </fieldset>

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
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Kühlt nur die erste Stunde spürbar ab.
              </span>
            </span>
          </label>
        </div>
      </Card>
      </div>

      {/* --- Submit --- */}
      <button
        type="button"
        onClick={startCheck}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-4 text-lg font-extrabold tracking-tight text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.99] lg:mx-auto lg:max-w-md"
      >
        HitzeCheck starten
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

      <DisclaimerBox />
      <FeedbackSupport pageLabel="Hauptseite" />
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
    <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
      <span className="text-orange-500">{icon}</span>
      {title}
    </h2>
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
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
      >
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>

      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-3 pr-10 pl-3.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
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

      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
