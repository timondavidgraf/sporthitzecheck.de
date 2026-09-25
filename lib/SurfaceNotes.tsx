import { ThermometerSun, Trees } from "lucide-react";
import { getSurfaceConfig, type Sport } from "@/lib/sportsConfig";
import type { Surface } from "@/lib/wbgtCalculator";

const NO_OFFSET_NOTE =
  "Kein belegter WBGT-Zahlenzuschlag für diesen Belag – nur qualitativer Hinweis.";

const STYLES = {
  form: {
    box: "gap-2.5 rounded-lg px-3.5 py-3 text-sm lg:col-span-2",
    icon: "size-4",
  },
  compact: {
    box: "gap-2 rounded-md px-2.5 py-2 text-xs",
    icon: "size-3.5",
  },
} as const;

/**
 * Warn- und Hinweistexte zum gewählten Belag – im Formular und auf der
 * Ergebnisseite identisch, nur unterschiedlich groß.
 */
export function SurfaceNotes({
  sport,
  surface,
  size = "form",
}: {
  sport: Sport;
  surface: Surface;
  size?: keyof typeof STYLES;
}) {
  const config = getSurfaceConfig(sport, surface);
  const style = STYLES[size];
  const warning =
    config.hazardWarning ?? (config.wbgtOffset == null ? NO_OFFSET_NOTE : null);

  return (
    <>
      {warning ? (
        <p
          role="note"
          className={`flex items-start border border-amber-200 bg-amber-50 leading-relaxed text-amber-950 ${style.box}`}
        >
          <ThermometerSun className={`mt-0.5 shrink-0 text-amber-600 ${style.icon}`} aria-hidden />
          <span>{warning}</span>
        </p>
      ) : null}
      {config.hinweis ? (
        <p
          role="note"
          className={`flex items-start border border-slate-200 bg-slate-50 leading-relaxed text-slate-700 ${style.box}`}
        >
          <Trees className={`mt-0.5 shrink-0 text-slate-500 ${style.icon}`} aria-hidden />
          <span>{config.hinweis}</span>
        </p>
      ) : null}
    </>
  );
}
