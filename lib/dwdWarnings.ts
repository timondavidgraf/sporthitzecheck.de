/**
 * Amtliche Hitzewarnungen des Deutschen Wetterdienstes (DWD).
 *
 * Der Musterhitzeschutzplan für den organisierten Sport (BMG, DOSB, KLUG;
 * 2025) knüpft seine Maßnahmen an die beiden DWD-Hitzewarnstufen. Die Ampel
 * dieser App ersetzt die Warnung nicht – beide stehen nebeneinander.
 *
 * Abruf über Bright Sky (api.brightsky.dev), das die Warnungen des DWD als
 * JSON bereitstellt. Die Warnungen gelten nur für Deutschland und nur für
 * heute und die nächsten Tage; für alles andere liefert der Dienst nichts.
 */

const ALERTS_URL = "https://api.brightsky.dev/alerts";

/** DWD-Ereigniscodes: 247 „starke Hitze“, 248 „extreme Hitze“. */
const HEAT_CODE_STRONG = 247;
const HEAT_CODE_EXTREME = 248;

export interface HeatWarning {
  /** 1 = starke Wärmebelastung, 2 = extreme Wärmebelastung */
  level: 1 | 2;
  /** Beginn und Ende der Warnung als ISO-Zeitstempel */
  onset: string;
  expires: string | null;
}

export interface DwdAlert {
  event_code?: number | null;
  event_de?: string | null;
  onset?: string | null;
  expires?: string | null;
}

function heatLevel(alert: DwdAlert): 1 | 2 | null {
  const name = (alert.event_de ?? "").toUpperCase();
  if (alert.event_code === HEAT_CODE_EXTREME || name.includes("EXTREME HITZE")) return 2;
  if (alert.event_code === HEAT_CODE_STRONG || name.includes("HITZE")) return 1;
  return null;
}

/**
 * Höchste Hitzewarnung, die sich mit der Einheit überschneidet – oder null.
 *
 * Warnungen ohne lesbaren Beginn werden übergangen: lieber keine Anzeige als
 * eine Warnung für den falschen Zeitraum.
 */
export function heatWarningFrom(
  alerts: readonly DwdAlert[],
  sessionStart: Date,
  sessionEnd: Date
): HeatWarning | null {
  let best: HeatWarning | null = null;

  for (const alert of alerts) {
    const level = heatLevel(alert);
    if (level === null || !alert.onset) continue;

    const onset = new Date(alert.onset).getTime();
    if (Number.isNaN(onset)) continue;
    const expires = alert.expires ? new Date(alert.expires).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isNaN(expires)) continue;

    const overlaps = onset < sessionEnd.getTime() && expires > sessionStart.getTime();
    if (!overlaps) continue;

    if (!best || level > best.level) {
      best = { level, onset: alert.onset, expires: alert.expires ?? null };
    }
  }

  return best;
}

/**
 * Fragt die aktuellen DWD-Warnungen für den Ort ab.
 *
 * Fehler führen zu null: die Hitzewarnung ist eine Zusatzinformation und darf
 * die Ampel nie blockieren. Koordinaten gehen auf zwei Nachkommastellen
 * gerundet (rund 1 km) hinaus – für eine Warnung je Gemeinde reicht das.
 */
export async function fetchHeatWarning(
  lat: number,
  lng: number,
  sessionStart: Date,
  sessionEnd: Date
): Promise<HeatWarning | null> {
  try {
    const url = new URL(ALERTS_URL);
    url.searchParams.set("lat", lat.toFixed(2));
    url.searchParams.set("lon", lng.toFixed(2));

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;

    const data = (await response.json()) as { alerts?: DwdAlert[] };
    if (!Array.isArray(data.alerts)) return null;

    return heatWarningFrom(data.alerts, sessionStart, sessionEnd);
  } catch {
    return null;
  }
}
