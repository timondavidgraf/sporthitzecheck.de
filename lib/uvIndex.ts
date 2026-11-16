/**
 * UV-Index: Einordnung nach der WHO-Skala, wie sie auch das Bundesamt für
 * Strahlenschutz verwendet. Der UV-Index ist unabhängig vom WBGT – ein kühler,
 * klarer Tag kann hohe UV-Werte haben.
 */

export type UvCategory = "niedrig" | "mäßig" | "hoch" | "sehr hoch" | "extrem";

/** WHO-Stufen: 0–2 niedrig, 3–5 mäßig, 6–7 hoch, 8–10 sehr hoch, ab 11 extrem. */
export function uvCategory(uvIndex: number): UvCategory {
  const rounded = Math.round(uvIndex);
  if (rounded >= 11) return "extrem";
  if (rounded >= 8) return "sehr hoch";
  if (rounded >= 6) return "hoch";
  if (rounded >= 3) return "mäßig";
  return "niedrig";
}

/** Schutzhinweis ab UV-Index 3; darunter ist kein Schutz erforderlich. */
export function uvAdvice(uvIndex: number): string | null {
  const rounded = Math.round(uvIndex);
  if (rounded >= 8) return "Sonnenschutz unbedingt nötig, Mittagssonne meiden";
  if (rounded >= 3) return "Sonnenschutz nötig";
  return null;
}

/** Höchster UV-Index der übergebenen Stunden; null, wenn keiner vorliegt. */
export function peakUvIndex(hours: readonly { uvIndex: number | null }[]): number | null {
  const values = hours
    .map((hour) => hour.uvIndex)
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : null;
}
