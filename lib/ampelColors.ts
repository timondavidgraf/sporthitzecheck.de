import type { ColorCode } from "./wbgtCalculator";

/** Ampelfarben an einer Stelle – Formular, Grenzwerte und Diagramm. */
export const AMPEL_BG: Record<ColorCode, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  red: "bg-red-600",
};

/** Gelb braucht dunkle Schrift, sonst ist der Kontrast unlesbar. */
export const AMPEL_TEXT: Record<ColorCode, string> = {
  green: "text-white",
  yellow: "text-slate-900",
  orange: "text-white",
  red: "text-white",
};

/** Gleiche Farben als Hex – recharts kann keine Tailwind-Klassen. */
export const AMPEL_HEX: Record<ColorCode, string> = {
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#f97316",
  red: "#dc2626",
};
