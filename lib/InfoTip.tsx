"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { sourcesRegistry, type SourceConfidence, type SourceId } from "@/lib/sourcesRegistry";

export function InfoTip({
  label,
  body,
  confidence,
  sourceIds = [],
}: {
  label: string;
  body: string;
  confidence?: SourceConfidence;
  sourceIds?: SourceId[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
      >
        <Info className="size-3.5" aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute top-full right-0 z-30 mt-1 w-80 rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed font-medium text-white shadow-lg"
        >
          {body}
          {confidence ? (
            <span className="mt-1.5 block text-white/75">Konfidenz: {confidence}</span>
          ) : null}
          {sourceIds.length > 0 ? (
            <span className="mt-1.5 block">
              <span className="text-white/75">Quellen:</span>
              {sourceIds.map((id) => {
                const source = sourcesRegistry[id];
                const sourceLabel = source.organisation ?? source.name;
                if (!source.url) {
                  return (
                    <span key={id} className="mt-0.5 block font-semibold text-orange-300">
                      {sourceLabel}
                    </span>
                  );
                }
                return (
                  <a
                    key={id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block font-semibold text-orange-300 underline decoration-orange-400/70 underline-offset-2 hover:text-orange-200"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {sourceLabel}
                  </a>
                );
              })}
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
