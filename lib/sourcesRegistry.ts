/**
 * Zentrale Quellen. UI und Empfehlungen referenzieren nur über `id`.
 */

export type SourceType =
  | "verbandsrichtlinie"
  | "wissenschaftliche_studie"
  | "fallback_referenz";

export type SourceConfidence = "hoch" | "mittel" | "niedrig";

export type SourceId =
  | "fifa_2026"
  | "fifpro"
  | "itf_heat_policy"
  | "uci_2023"
  | "world_athletics"
  | "acsm_general"
  | "acsm_fallback_beachvolleyball"
  | "fivb_studie_2012"
  | "fih_air_temp"
  | "grundstein_cooper_2020"
  | "pryor_2017"
  | "acgih_tlv"
  | "john_2024_canopy"
  | "irrigation_studies_turf"
  | "pending";

export interface Source {
  id: SourceId;
  typ: SourceType;
  name: string;
  organisation?: string;
  jahr?: number;
  url?: string;
  /** 1–2 Sätze, was diese Quelle für die App bedeutet. */
  kernaussage: string;
  konfidenz: SourceConfidence;
  einschraenkung?: string;
}

export const sourcesRegistry: Record<SourceId, Source> = {
  fifa_2026: {
    id: "fifa_2026",
    typ: "verbandsrichtlinie",
    name: "FIFA Emergency Care Manual 2026",
    organisation: "FIFA",
    jahr: 2026,
    kernaussage:
      "Definiert 27°C WBGT als Schwelle für freiwillige, 32°C für verpflichtende Cooling Breaks (2x3 Min. pro Halbzeit).",
    konfidenz: "hoch",
    einschraenkung:
      "Gilt für Profi-/Länderspielbetrieb, nicht spezifisch für Amateur-/Jugendfußball validiert.",
  },
  fifpro: {
    id: "fifpro",
    typ: "verbandsrichtlinie",
    name: "FIFPRO Open Letter/Empfehlung",
    organisation: "FIFPRO (Spielergewerkschaft)",
    kernaussage:
      "Empfiehlt niedrigere Schwellen als FIFA (Cooling Break ab 26°C, Spielverlegung ab 28°C) – von FIFA bisher nicht übernommen.",
    konfidenz: "hoch",
    einschraenkung:
      "Ist eine Forderung, keine offiziell geltende Regel – wird als Gegenposition, nicht als Standard angezeigt.",
  },
  itf_heat_policy: {
    id: "itf_heat_policy",
    typ: "verbandsrichtlinie",
    name: "ITF Extreme Weather Policy",
    organisation: "International Tennis Federation",
    kernaussage:
      "Zusätzliche 10-Minuten-Pause ab 30,1°C WBGT, Unterbrechungs-Richtwert bei 32,2°C.",
    konfidenz: "hoch",
  },
  uci_2023: {
    id: "uci_2023",
    typ: "verbandsrichtlinie",
    name: "UCI High Temperature Protocol",
    organisation: "Union Cycliste Internationale",
    jahr: 2023,
    kernaussage:
      "5-stufige WBGT-Skala, Hochrisiko-Schwelle bereits ab 28°C – strenger als die meisten anderen Verbände.",
    konfidenz: "hoch",
    einschraenkung:
      "Für Straßenrennen mit Windkühlung durch Fahrtgeschwindigkeit kalkuliert – bei sehr langsamer Fahrt (z.B. steile Anstiege) ggf. konservativer einzuschätzen.",
  },
  world_athletics: {
    id: "world_athletics",
    typ: "verbandsrichtlinie",
    name: "World Athletics Heat Rule",
    organisation: "World Athletics",
    kernaussage:
      "Warnung ab 25°C, starke Warnung ab 28°C, gefährlich ab 30°C WBGT – angewendet u.a. bei der WM Tokio 2025 (Startzeitverlegung).",
    konfidenz: "mittel",
    einschraenkung:
      "Kein vollständig publizierter Stufenkatalog wie bei UCI/FIFA verfügbar – Werte aus Anwendungsfällen abgeleitet.",
  },
  acsm_general: {
    id: "acsm_general",
    typ: "wissenschaftliche_studie",
    name: "ACSM Position Stand: Exertional Heat Illness",
    organisation: "American College of Sports Medicine",
    jahr: 2007,
    kernaussage:
      "Generische WBGT-Ampel für die Allgemeinbevölkerung/Breitensport, Basis für die Alters-/Akklimatisierungs-Offsets in dieser App.",
    konfidenz: "hoch",
  },
  acsm_fallback_beachvolleyball: {
    id: "acsm_fallback_beachvolleyball",
    typ: "fallback_referenz",
    name: "ACSM-Skala als Fallback (kein FIVB-Wert)",
    kernaussage:
      "FIVB definiert selbst keinen WBGT-Grenzwert. Diese App nutzt ersatzweise die ACSM-Skala.",
    konfidenz: "niedrig",
    einschraenkung:
      "FIVB-Feldstudien (Bahr & Reeser 2012) fanden niedrige Erkrankungsraten selbst bei WBGT >32°C – der hier verwendete Fallback-Wert ist für Profi-Beachvolleyball vermutlich zu konservativ, wird aber aus Vorsichtsgründen für alle Nutzer:innen beibehalten.",
  },
  fivb_studie_2012: {
    id: "fivb_studie_2012",
    typ: "wissenschaftliche_studie",
    name: "New guidelines are needed to manage heat stress in elite sports (FIVB Heat Stress Monitoring Programme)",
    organisation: "Bahr & Reeser, Br J Sports Med",
    jahr: 2012,
    kernaussage:
      "Nur 1 hitzebedingter medizinischer Rückzug in 48 Welttour-Events über 3 Saisons trotz häufiger WBGT-Überschreitungen >32°C.",
    konfidenz: "mittel",
    einschraenkung:
      "Beobachtungsstudie bei Profis, nicht ursächlich belegt, dass Breitensport-Spieler:innen gleich gut tolerieren.",
  },
  fih_air_temp: {
    id: "fih_air_temp",
    typ: "fallback_referenz",
    name: "FIH nutzt Lufttemperatur statt WBGT",
    organisation: "International Hockey Federation",
    kernaussage:
      "FIH aktiviert Maßnahmen erst ab 35°C Lufttemperatur, nicht über WBGT. Diese App zeigt trotzdem eine WBGT-Ampel (ACSM-Fallback) an, da unser gesamtes System auf WBGT basiert.",
    konfidenz: "niedrig",
    einschraenkung:
      "Direkte Vergleichbarkeit mit der FIH-eigenen Regel ist NICHT gegeben – unterschiedliche Messgrößen.",
  },
  grundstein_cooper_2020: {
    id: "grundstein_cooper_2020",
    typ: "wissenschaftliche_studie",
    name: "Comparison of WBGTs over Different Surfaces within an Athletic Complex",
    organisation: "Grundstein & Cooper, Medicina 56(6):313",
    jahr: 2020,
    kernaussage:
      "Kein statistisch signifikanter WBGT-Unterschied zwischen Naturrasen, Kunstrasen und Hardcourt-Tennis trotz messbar höherer Globe-Temperatur auf Kunstrasen/Tennis – Grund: gegenläufige Effekte bei Luftfeuchte gleichen sich aus.",
    konfidenz: "mittel",
    einschraenkung:
      "Nur eine Klimazone (feucht-subtropisch, USA) untersucht, nicht direkt auf jedes Klima übertragbar.",
  },
  pryor_2017: {
    id: "pryor_2017",
    typ: "wissenschaftliche_studie",
    name: "The Heat Strain of Various Athletic Surfaces",
    organisation: "Pryor et al., J Athl Train 52(11):1056-1064",
    jahr: 2017,
    kernaussage:
      "Signifikant höhere On-Site-WBGT-Werte (vs. Wetterstation) auf Hardcourt-Tennis, Tartanbahn und Beachvolleyball-Sand gemessen.",
    konfidenz: "mittel",
    einschraenkung:
      "Große Streuung zwischen Einzelmessungen, ein Vergleichspaar zeigte bis zu 10,9°C Unterschied ohne statistische Signifikanz.",
  },
  john_2024_canopy: {
    id: "john_2024_canopy",
    typ: "wissenschaftliche_studie",
    name: "Forest canopy cover affects microclimate buffering during an extreme heat event",
    organisation: "John et al., Environmental Research Communications 6:091015",
    jahr: 2024,
    kernaussage:
      "Waldbereiche waren während einer Hitzewelle 3 °C kühler als eine gerodete Fläche und 4 °C kühler als die Region insgesamt – Beleg für den Kühleffekt von Waldschatten, wird in dieser App über das Beschattungs-Feld abgebildet statt über einen Untergrund-Offset.",
    konfidenz: "mittel",
    einschraenkung:
      "Untersucht Lufttemperatur in Waldbeständen, nicht WBGT auf Wald-Trainingswegen speziell – Übertragung ist eine Näherung.",
  },
  irrigation_studies_turf: {
    id: "irrigation_studies_turf",
    typ: "wissenschaftliche_studie",
    name: "Surface Temperature Experienced and Irrigation Effects on Artificial Turf / Climate adaptive solution for artificial turf in cities",
    organisation: "diverse, u. a. Frontiers in Sustainable Cities 2024",
    kernaussage:
      "Bewässerte Kunstrasenflächen erreichen Oberflächentemperaturen nur ca. 2 °C über Naturrasen, unbewässerte Flächen dagegen 60–80 °C.",
    konfidenz: "mittel",
    einschraenkung:
      "Misst Oberflächentemperatur, nicht WBGT direkt – Übertragung auf WBGT-Nettoeffekt ist eine Näherung, gestützt durch die generelle Erkenntnis aus Grundstein & Cooper 2020, dass WBGT gedämpfter auf Oberflächeneffekte reagiert als reine Temperaturmessungen.",
  },
  acgih_tlv: {
    id: "acgih_tlv",
    typ: "wissenschaftliche_studie",
    name: "ACGIH Threshold Limit Values (TLV) for Heat Stress",
    organisation: "American Conference of Governmental Industrial Hygienists",
    kernaussage:
      "Etabliertes arbeitsmedizinisches Modell, das WBGT-Grenzwerte abhängig von Belastungsintensität und Pausenanteil anpasst (z. B. kontinuierliche leichte Arbeit: 30 °C zulässig, schwere Arbeit mit 75 % Pause: 32,2 °C zulässig).",
    konfidenz: "niedrig",
    einschraenkung:
      "Für Industriearbeiter entwickelt, NICHT für Sport validiert. Die in dieser App verwendeten Offset-Werte (±1,5 °C) sind eine grobe Analogie-Übertragung auf sportliche Belastung, keine direkte Anwendung der ACGIH-Tabelle. Deutlich als Näherungsmodell kennzeichnen.",
  },
  pending: {
    id: "pending",
    typ: "fallback_referenz",
    name: "Untergrund noch nicht recherchiert",
    kernaussage:
      "Für diesen Belag liegt in der App noch keine belastbare, sportartspezifische WBGT-Studie vor. Es wird kein Zahlen-Offset als belegt dargestellt.",
    konfidenz: "niedrig",
    einschraenkung:
      "Platzhalter. Sobald eine Quelle nachgezogen ist, ersetzt sie diesen Eintrag.",
  },
};

export const LOW_CONFIDENCE_BADGE =
  "Kein offizieller Verbandsgrenzwert – Näherung";

export const FALLBACK_AGE_HINT =
  "Fallback-Wert gilt bereits konservativ für alle Altersgruppen";

export const WHY_THESE_VALUES_LABEL = "Warum diese Werte? →";
export const SOURCES_SECTION_ID = "quellen";
export const SOURCES_SECTION_HREF = `#${SOURCES_SECTION_ID}`;
export const SOURCES_BLOCK_THRESHOLDS = "quellen-grenzwerte";
export const SOURCES_BLOCK_RECS = "quellen-empfehlungen";
export const SOURCES_BLOCK_SURFACE = "quellen-untergrund";

export const SOURCES_DISCLAIMER =
  "Diese App liefert eine WBGT-Näherung auf Basis von Wetterdaten (Open-Meteo) und öffentlich zugänglichen Sportverbands-Richtlinien. Sie ersetzt keine Vor-Ort-Messung, keine medizinische Beratung und keine Entscheidung von Schiedsrichtern, Trainern oder medizinischem Personal vor Ort. Bei gesundheitlichen Symptomen: sofort abbrechen und kühlen.";

export function sourceAnchorId(id: SourceId): string {
  return `quelle-${id}`;
}

export function sourceHref(id: SourceId): string {
  return `#${sourceAnchorId(id)}`;
}

export function sourcesBlockHref(
  block: typeof SOURCES_BLOCK_THRESHOLDS | typeof SOURCES_BLOCK_RECS | typeof SOURCES_BLOCK_SURFACE
): string {
  return `#${block}`;
}
