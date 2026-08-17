"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { labelFor, SPORT_OPTIONS } from "@/lib/formOptions";
import {
  getSurfaceConfig,
  SPORTS,
  usesProfiThresholds,
  type Sport,
} from "@/lib/sportsConfig";
import {
  SOURCES_BLOCK_RECS,
  SOURCES_BLOCK_SURFACE,
  SOURCES_BLOCK_THRESHOLDS,
  SOURCES_SECTION_ID,
  sourceAnchorId,
  sourceHref,
  sourcesRegistry,
  type Source,
  type SourceConfidence,
  type SourceId,
} from "@/lib/sourcesRegistry";
import type { ColorCode, Surface } from "@/lib/wbgtCalculator";

const COLOR_LABEL: Record<ColorCode, string> = {
  green: "Grün",
  yellow: "Gelb",
  orange: "Orange",
  red: "Rot",
};

const BADGE_CLASS: Record<SourceConfidence, string> = {
  hoch: "border-emerald-200 bg-emerald-50 text-emerald-800",
  mittel: "border-amber-200 bg-amber-50 text-amber-900",
  niedrig: "border-rose-200 bg-rose-50 text-rose-800",
};

function uniqueIds(ids: SourceId[]): SourceId[] {
  return [...new Set(ids)];
}

export function thresholdSourceIds(sport: Sport): SourceId[] {
  const t = SPORTS[sport].thresholds;
  const ids: SourceId[] = [t.sourceId];
  if (t.alternative) ids.push(t.alternative.sourceId);
  if (sport === "beachvolleyball") ids.push("fivb_studie_2012");
  if (usesProfiThresholds(sport)) {
    ids.push("acsm_general");
    ids.push("aging_heat");
    ids.push("notley_2025_youth");
  }
  ids.push("acgih_tlv");
  return uniqueIds(ids);
}

/** Quelle zum gewählten Untergrund; immer gesetzt, inkl. Platzhalter `pending`. */
export function surfaceSourceId(sport: Sport, surface: Surface): SourceId {
  return getSurfaceConfig(sport, surface).quelle_id;
}

export function SourceInfoButton({
  sourceId,
  variant = "tooltip",
}: {
  sourceId: SourceId;
  variant?: "tooltip" | "anchor";
}) {
  const source = sourcesRegistry[sourceId];
  const [open, setOpen] = useState(false);
  const className =
    "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600";

  if (variant === "anchor") {
    return (
      <a
        href={sourceHref(sourceId)}
        onClick={(event) => event.stopPropagation()}
        className={className}
        aria-label={`Zur Quelle: ${source.name}`}
        title={source.name}
      >
        <Info className="size-3.5" aria-hidden />
      </a>
    );
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Quelle: ${source.name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onBlur={() => setOpen(false)}
        className={className}
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute top-full right-0 z-30 mt-1 w-64 rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed font-medium text-white shadow-lg"
        >
          <span className="block font-semibold">{source.name}</span>
          {source.kernaussage}
        </span>
      ) : null}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: SourceConfidence }) {
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${BADGE_CLASS[level]}`}
    >
      Konfidenz: {level}
    </span>
  );
}

function SourceCard({ source }: { source: Source }) {
  const meta = [source.organisation, source.jahr].filter(Boolean).join(", ");
  return (
    <article id={sourceAnchorId(source.id)} className="scroll-mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{source.name}</h4>
        <ConfidenceBadge level={source.konfidenz} />
      </div>
      {meta ? <p className="mt-0.5 text-xs text-slate-500">{meta}</p> : null}
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{source.kernaussage}</p>
      {source.einschraenkung ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 italic">
          {source.einschraenkung}
        </p>
      ) : null}
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-orange-700 underline decoration-orange-200 underline-offset-2 hover:decoration-orange-500"
        >
          Quelle öffnen
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </article>
  );
}

function SourceBlock({
  id,
  title,
  sources,
}: {
  id: string;
  title: string;
  sources: Source[];
}) {
  if (!sources.length) return null;
  const low = sources.some((s) => s.konfidenz === "niedrig");

  return (
    <section
      id={id}
      className={`scroll-mt-4 rounded-lg p-3 ${
        low ? "border border-slate-200 bg-slate-50" : "border border-transparent"
      }`}
    >
      {low ? (
        <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Eingeschränkte Datenlage
        </p>
      ) : null}
      <h3 className={`text-sm font-bold text-slate-800 ${low ? "mt-1" : ""}`}>{title}</h3>
      <div className="mt-3 flex flex-col gap-4">
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </section>
  );
}

export function ScienceSources({
  sport,
  surface,
  colorCode,
  recommendationQuelleId,
}: {
  sport: Sport;
  surface: Surface;
  colorCode: ColorCode;
  recommendationQuelleId: SourceId;
}) {
  const [open, setOpen] = useState(false);
  const sportLabel = labelFor(SPORT_OPTIONS, sport);
  const surfaceLabel = getSurfaceConfig(sport, surface).name;

  const thresholdSources = thresholdSourceIds(sport).map(
    (id) => sourcesRegistry[id]
  );
  const recSource = sourcesRegistry[recommendationQuelleId];
  const surfaceSources = [sourcesRegistry[surfaceSourceId(sport, surface)]];

  useEffect(() => {
    const reveal = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (
        hash === SOURCES_SECTION_ID ||
        hash === SOURCES_BLOCK_THRESHOLDS ||
        hash === SOURCES_BLOCK_RECS ||
        hash === SOURCES_BLOCK_SURFACE ||
        hash.startsWith("quelle-")
      ) {
        setOpen(true);
        window.setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <details
        id={SOURCES_SECTION_ID}
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="group rounded-xl border border-gray-200 bg-white shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-semibold text-slate-700">
          Medizinische Grundlagen & Quellen
          <ChevronDown
            className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180"
            aria-hidden
          />
        </summary>

        <div className="flex flex-col gap-4 border-t border-gray-200 p-3">
          <SourceBlock
            id={SOURCES_BLOCK_THRESHOLDS}
            title={`Grenzwerte für ${sportLabel}`}
            sources={thresholdSources}
          />
          <SourceBlock
            id={SOURCES_BLOCK_RECS}
            title={`Handlungsempfehlungen für Stufe ${COLOR_LABEL[colorCode]}`}
            sources={[recSource]}
          />
          <SourceBlock
            id={SOURCES_BLOCK_SURFACE}
            title={`Untergrund: ${surfaceLabel}`}
            sources={surfaceSources}
          />
        </div>
      </details>
    </div>
  );
}
