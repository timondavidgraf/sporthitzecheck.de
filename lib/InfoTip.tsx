"use client";

import { sourcesRegistry, type SourceConfidence, type SourceId } from "@/lib/sourcesRegistry";
import { Tip } from "@/lib/TipPopover";

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
  return (
    <Tip label={label}>
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
    </Tip>
  );
}
