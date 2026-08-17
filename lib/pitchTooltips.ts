import {
  formatOffset,
  getSurfaceConfig,
  isSyntheticTurf,
  surfaceOffsetDisplay,
  type Sport,
  type SurfaceConfidence,
} from "@/lib/sportsConfig";
import {
  SHADOW_DIFFUSE_FACTORS,
  SHADOW_FACTORS,
  WATERING_COOLING,
  WATERING_MAX_HUMIDITY,
  type Shadow,
  type Surface,
} from "@/lib/wbgtCalculator";
import type { SourceConfidence, SourceId } from "@/lib/sourcesRegistry";

function tipConfidence(value: SurfaceConfidence): SourceConfidence {
  if (value === "hoch" || value === "mittel" || value === "niedrig") return value;
  return "niedrig";
}

export interface PitchTip {
  body: string;
  confidence: SourceConfidence;
  sourceIds: SourceId[];
}

const TURF_WBGT_TIP =
  "Kein Zahlen-Zuschlag: In Brusthöhe (ca. 1,2 m) ist der WBGT auf Kunstrasen oft ähnlich wie auf Naturrasen. Trockenes Infill transpiriert nicht – weniger Schwüle (Feuchtkugel) gleicht die hohe Strahlung (Schwarzkugel, 20 % der Formel) fast aus. Das Gefühl bleibt anders: trockene Backofen-Hitze statt tropischer Schwüle. Infill ändert vor allem die Oberfläche, kaum den Index in 1,2 m: SBR/EPDM-Gummi oft 65–75 °C, speichert Hitze lange, Wasser fließt ab oder verdampft sofort. Kork und organische Infills oft 10–15 °C kühler, kühlen im Schatten schneller und können Wasser halten – dann senkt Verdunstung den WBGT messbarer. Sand und TPE liegen dazwischen. Unterhalb der Waden (10–50 cm) strahlt dunkles Gummi stark auf Schuhe und Beine; Kinder stehen näher am heißen Boden. Das erfasst die Ampel nicht. Eine Studie fand +2,2 °C WBGT – deshalb Warnhinweis statt Zuschlag.";

export function surfaceEffectTip(sport: Sport, surface: Surface): PitchTip {
  const config = getSurfaceConfig(sport, surface);
  const display = surfaceOffsetDisplay(config);
  const extra = config.hazardWarning ?? config.hinweis ?? "";
  const hockeyNote =
    sport === "fieldhockey" && isSyntheticTurf(surface)
      ? " Keine hockeyspezifische WBGT-Messung."
      : "";

  if (isSyntheticTurf(surface)) {
    return {
      body: `${TURF_WBGT_TIP}${hockeyNote}`,
      confidence: tipConfidence(config.konfidenz),
      sourceIds: [config.quelle_id],
    };
  }

  if (config.wbgtOffset == null) {
    return {
      body: `${config.name}: kein Zahlen-Zuschlag auf den WBGT – die Studienlage zum Index ist widersprüchlich oder fehlt. ${extra} Die Oberfläche kann trotzdem sehr heiß werden (Kontakt, Strahlung in Kopfhöhe).`.trim(),
      confidence: tipConfidence(config.konfidenz),
      sourceIds: [config.quelle_id],
    };
  }

  if (config.wbgtOffset === 0) {
    const why =
      config.kein_offset_grund ??
      "Gegenüber der Wetterstationsnäherung rechnen wir keinen Extra-Zuschlag.";
    return {
      body: `${config.name}: ±0,0 °C. ${why} ${extra}`.trim(),
      confidence: tipConfidence(config.konfidenz),
      sourceIds: [config.quelle_id],
    };
  }

  return {
    body: `${config.name}: ${display ?? formatOffset(config.wbgtOffset)} auf den berechneten WBGT. Grundlage ist vor allem, dass der Platz wärmer ist als die Wetterstation (Pryor 2017) – nicht eine Rangfolge der Beläge. Im Schatten wirkt der Zuschlag anteilig weniger. ${extra}`.trim(),
    confidence: tipConfidence(config.konfidenz),
    sourceIds: [config.quelle_id],
  };
}

export function shadowEffectTip(shadow: Shadow): PitchTip {
  const directPct = Math.round(SHADOW_FACTORS[shadow] * 100);
  const diffusePct = Math.round(SHADOW_DIFFUSE_FACTORS[shadow] * 100);

  if (shadow === "none") {
    return {
      body: `Volle Sonne: ${directPct} % der Direktstrahlung und ${diffusePct} % der diffusen Strahlung gehen in den WBGT (Schwarzkugel = 20 % der Formel). Kein Strahlungsabzug. Nachts ist die Direktstrahlung ohnehin null – dann ändert Beschattung den Wert kaum.`,
      confidence: "mittel",
      sourceIds: ["wbgt_model"],
    };
  }
  if (shadow === "partial") {
    return {
      body: `Halbschatten (Bäume, Tribüne): wir rechnen ${directPct} % der Direktstrahlung und ${diffusePct} % der Himmelsstrahlung. Das senkt vor allem die Schwarzkugel. Baumschatten kühlt die Luft zusätzlich – das steckt nicht extra im Untergrund, nur hier.`,
      confidence: "mittel",
      sourceIds: ["wbgt_model", "john_2024_canopy"],
    };
  }
  return {
    body: `Komplett beschattet (Dach, volle Tribüne): keine Direktstrahlung (${directPct} %), ${diffusePct} % Rest-Diffuslicht. Stärkster Strahlungsabzug. Ein Untergrund-Zuschlag wird im selben Verhältnis abgeschwächt.`,
    confidence: "mittel",
    sourceIds: ["wbgt_model"],
  };
}

export function wateringEffectTip(surface?: Surface): PitchTip {
  const cooling = WATERING_COOLING.toFixed(1).replace(".", ",");
  const infill =
    surface && isSyntheticTurf(surface)
      ? " Auf Kunstrasen hängt der Nutzen stark am Infill: Kork und organische Granulate können Wasser halten und dann per Verdunstung kühlen; bei SBR/EPDM-Gummi fließt oder verdampft Wasser schnell – der WBGT ändert sich kaum, die Oberfläche reboundet oft in 20–45 Minuten."
      : "";
  return {
    body: `Bewässerung kühlt vor allem die Oberfläche, nicht zuverlässig den WBGT.${infill} Penn State: nach dem Wässern rebounden Oberflächentemperaturen oft schon nach 20–45 Minuten, bei stärkerer Gabe nach etwa einer Stunde (McNitt et al. 2008; Serensits et al. 2011). Williams & Pulley (2002) maßen nach 5 Minuten schon wieder einen starken Anstieg. Für den WBGT auf Sportplätzen gibt es keine Messung; flächige Feldbewässerung senkt ihn tagsüber um 0,3–1,3 °C, nachts kann extra Feuchte ihn erhöhen. Deshalb nur −${cooling} °C in der ersten Stunde, nur bei Sonne und unter ${WATERING_MAX_HUMIDITY} % Luftfeuchte – sonst kein Abzug. Das gilt unabhängig vom Infill: wir unterscheiden die Granulate in der Zahl nicht.`,
    confidence: "niedrig",
    sourceIds: ["irrigation_studies_turf"],
  };
}
