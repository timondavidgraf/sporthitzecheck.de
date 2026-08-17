"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import {
  ageGroupTooltip,
  ageOptionsForSport,
  intensityOffsetLabel,
  intensityOptionsForSport,
  intensityTooltip,
  labelFor,
  PERFORMANCE_OPTIONS,
  performanceOffsetLabel,
  performanceTooltip,
  shortLabelFor,
  SPORT_OPTIONS,
  type OffsetTooltipContent,
} from "@/lib/formOptions";
import {
  SPORTS,
  ageThresholdOffset,
  appliedBounds,
  baseBoundsForSport,
  formatOffset,
  sportConfidence,
  thresholdSourceShort,
  usesProfiThresholds,
  type AlternativeThresholds,
  type IntensityLevel,
  type Sport,
} from "@/lib/sportsConfig";
import {
  LOW_CONFIDENCE_BADGE,
  SOURCES_BLOCK_THRESHOLDS,
  WHY_THESE_VALUES_LABEL,
  sourceHref,
  sourcesBlockHref,
  sourcesRegistry,
  type SourceConfidence,
  type SourceId,
} from "@/lib/sourcesRegistry";
import type { AgeBand, ColorCode, PerformanceLevel } from "@/lib/wbgtCalculator";

const AMPEL_BG: Record<ColorCode, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  red: "bg-red-600",
};

const THRESHOLD_STEPS: { code: ColorCode; label: string }[] = [
  { code: "green", label: "Grün" },
  { code: "yellow", label: "Gelb" },
  { code: "orange", label: "Orange" },
  { code: "red", label: "Rot" },
];

function rangeLabel(
  code: ColorCode,
  bounds: { gruen_max: number; gelb_max: number; orange_max: number }
): string {
  const g = bounds.gruen_max.toFixed(1);
  const y = bounds.gelb_max.toFixed(1);
  const o = bounds.orange_max.toFixed(1);
  if (code === "green") return `≤ ${g} °C`;
  if (code === "yellow") return `> ${g} – ${y} °C`;
  if (code === "orange") return `> ${y} – ${o} °C`;
  return `> ${o} °C`;
}

export function ThresholdsBox({
  sport,
  ageGroup,
  performanceLevel,
  intensity,
  colorCode,
  maxWbgt,
}: {
  sport: Sport;
  ageGroup: AgeBand;
  performanceLevel: PerformanceLevel;
  intensity: IntensityLevel;
  colorCode: ColorCode;
  maxWbgt: number;
}) {
  const config = SPORTS[sport];
  const confidence = sportConfidence(sport);
  const bounds = appliedBounds(sport, ageGroup, intensity, performanceLevel);
  const ageOffset = ageThresholdOffset(sport, ageGroup);
  const interpolation = config.thresholds.interpolationNote;
  const showWhyLink = confidence === "niedrig" || confidence === "mittel";
  const fifpro = config.thresholds.alternative;
  const extraPauseAt = config.thresholds.extraPauseAt;
  const suspensionAt = config.thresholds.suspensionAt;
  const intensityOptions = intensityOptionsForSport(sport);
  const ageOptions = ageOptionsForSport(sport);

  const contextTags = [
    shortLabelFor(SPORT_OPTIONS, sport),
    shortLabelFor(ageOptions, ageGroup),
    shortLabelFor(PERFORMANCE_OPTIONS, performanceLevel),
    shortLabelFor(intensityOptions, intensity),
  ];

  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Grenzwerte
        </h2>
        {confidence === "niedrig" && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            ⚠ {LOW_CONFIDENCE_BADGE}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {contextTags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <span>
          {usesProfiThresholds(sport) ? "Verbandsschwelle" : "Studienschwellen"}:{" "}
          {thresholdSourceShort(sport)}
        </span>
        <OfficialThresholdsTip sport={sport} />
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <span>
          Altersklasse: {labelFor(ageOptions, ageGroup)} → {formatOffset(ageOffset)}
        </span>
        <OffsetHintTip
          tooltip={ageGroupTooltip(sport, ageGroup)}
          label="Hinweis zur Altersklasse"
        />
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <span>
          Leistungsstufe: {labelFor(PERFORMANCE_OPTIONS, performanceLevel)} →{" "}
          {performanceOffsetLabel(sport, ageGroup, performanceLevel)}
        </span>
        <OffsetHintTip
          tooltip={performanceTooltip(sport, performanceLevel)}
          label="Hinweis zur Leistungsstufe"
        />
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <span>
          Intensität: {shortLabelFor(intensityOptions, intensity)} →{" "}
          {intensityOffsetLabel(intensity)}
        </span>
        <OffsetHintTip
          tooltip={intensityTooltip(intensity)}
          label="Hinweis zur Intensität"
        />
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {THRESHOLD_STEPS.map((step) => {
          const active = step.code === colorCode;
          const note = config.thresholds.stageNotes?.[step.code];
          const showInterpTip =
            sport === "football" &&
            (step.code === "yellow" || step.code === "orange") &&
            interpolation;
          return (
            <li
              key={step.code}
              className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-sm ${
                active
                  ? "border-slate-400 bg-slate-50 ring-1 ring-slate-400"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${AMPEL_BG[step.code]}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  {step.label}
                  {note ? ` (${note})` : ""}
                </span>
                {showInterpTip ? <InterpTip text={interpolation} /> : null}
                {active && (
                  <span className="text-[11px] font-medium text-slate-500">aktuell</span>
                )}
              </span>
              <span className="shrink-0 font-semibold text-slate-800 tabular-nums">
                {rangeLabel(step.code, bounds)}
              </span>
            </li>
          );
        })}
      </ul>

      {sport === "tennis" && extraPauseAt != null && maxWbgt >= extraPauseAt && (
        <p className="mt-2 text-xs font-medium text-slate-700">
          ITF-Richtwert für zusätzliche Pause erreicht ({extraPauseAt.toFixed(1)} °C)
        </p>
      )}
      {sport === "tennis" && suspensionAt != null && maxWbgt >= suspensionAt && (
        <p className="mt-1 text-xs font-medium text-slate-700">
          ITF-Suspension-Richtwert erreicht ({suspensionAt.toFixed(1)} °C)
        </p>
      )}

      {fifpro && <FifproNote alternative={fifpro} />}

      {showWhyLink && (
        <a
          href={sourcesBlockHref(SOURCES_BLOCK_THRESHOLDS)}
          className="mt-3 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-orange-600"
        >
          {WHY_THESE_VALUES_LABEL}
        </a>
      )}
    </section>
  );
}

function OfficialThresholdsTip({ sport }: { sport: Sport }) {
  const [open, setOpen] = useState(false);
  const base = baseBoundsForSport(sport);
  const sourceId = SPORTS[sport].thresholds.sourceId;
  const source = sourcesRegistry[sourceId];
  const short = thresholdSourceShort(sport);

  return (
    <span
      className="relative inline-flex"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
      >
        <Info className="size-3.5" aria-hidden />
        <span className="sr-only">Verbands- bzw. Studiengrenzwerte</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-1 w-72 rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed font-medium text-white shadow-lg"
        >
          <span className="block">
            {usesProfiThresholds(sport)
              ? `Unveränderte ${short}-Schwellen für den Profi-/Wettkampfbetrieb:`
              : "ACSM-Studienschwellen, kein Verbandswert:"}
          </span>
          {THRESHOLD_STEPS.map((step) => (
            <span key={step.code} className="mt-0.5 block tabular-nums">
              {step.label}: {rangeLabel(step.code, base)}
            </span>
          ))}
          <TooltipConfidence level={source.konfidenz} />
          <TooltipSources sourceIds={[sourceId]} />
        </span>
      )}
    </span>
  );
}

function OffsetHintTip({
  tooltip,
  label,
}: {
  tooltip: OffsetTooltipContent;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
      >
        <Info className="size-3.5" aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-1 w-72 rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed font-medium text-white shadow-lg"
        >
          {tooltip.body}
          <TooltipConfidence level={tooltip.confidence} />
          <TooltipSources sourceIds={tooltip.sourceIds} />
        </span>
      )}
    </span>
  );
}

function TooltipConfidence({ level }: { level: SourceConfidence }) {
  return (
    <span className="mt-1.5 block text-white/75">Konfidenz: {level}</span>
  );
}

function TooltipSources({ sourceIds }: { sourceIds: SourceId[] }) {
  return (
    <span className="mt-1.5 block">
      <span className="text-white/75">Quellen:</span>
      {sourceIds.map((id) => {
        const source = sourcesRegistry[id];
        return (
          <a
            key={id}
            href={sourceHref(id)}
            className="mt-0.5 block font-semibold text-orange-300 underline decoration-orange-400/70 underline-offset-2 hover:text-orange-200"
          >
            {source.organisation ?? source.name}
          </a>
        );
      })}
    </span>
  );
}

function InterpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
      >
        <Info className="size-3.5" aria-hidden />
        <span className="sr-only">Hinweis zur Stufe</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-1 w-56 rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed font-medium text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

function FifproNote({ alternative }: { alternative: AlternativeThresholds }) {
  const source = sourcesRegistry[alternative.sourceId];
  return (
    <details className="group mt-3 rounded-lg border border-gray-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold text-slate-600">
        FIFPRO empfiehlt niedrigere Schwellen
        <ChevronDown
          className="size-3.5 shrink-0 text-slate-400 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-gray-200 px-2.5 py-2 text-xs leading-relaxed text-slate-600">
        <p>{source.kernaussage}</p>
        <p className="mt-1.5 font-medium text-slate-800 tabular-nums">
          Cooling Break ab {alternative.cooling_break_ab.toFixed(1)} °C · Verlegung
          empfohlen ab {alternative.verlegung_empfohlen_ab.toFixed(1)} °C
        </p>
      </div>
    </details>
  );
}
