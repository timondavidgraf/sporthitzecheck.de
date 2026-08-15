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
  | "aging_heat"
  | "acsm_fallback_beachvolleyball"
  | "fivb_studie_2012"
  | "fih_air_temp"
  | "grundstein_cooper_2020"
  | "pryor_2017"
  | "acgih_tlv"
  | "john_2024_canopy"
  | "irrigation_studies_turf"
  | "wbgt_model"
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
    name: "FIFA Hitzerichtlinie / Emergency Care Manual",
    organisation: "FIFA",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10364156/",
    kernaussage:
      "Vier Risikostufen: niedrig <24 °C, moderat 24–29 °C, hoch 30–32 °C, extrem >32 °C WBGT. Ab 32 °C sind Cooling Breaks in beiden Halbzeiten verpflichtend, Verlegung oder Abbruch liegt im Ermessen des Veranstalters.",
    konfidenz: "hoch",
    einschraenkung:
      "Gilt für Profi-/Länderspielbetrieb, nicht für Amateur-/Jugendfußball validiert. Die Richtlinie ist seit rund 20 Jahren unverändert und gilt in der Sportmedizin als weniger schützend als Vorgaben anderer Verbände (Racinais et al., BJSM 2023); FIFPRO fordert deutlich niedrigere Schwellen.",
  },
  fifpro: {
    id: "fifpro",
    typ: "verbandsrichtlinie",
    name: "FIFPRO Open Letter/Empfehlung",
    organisation: "FIFPRO (Spielergewerkschaft)",
    url: "https://www.fifpro.org/en/articles/2023/08/eleven-tips-for-dealing-with-hot-conditions-in-professional-football",
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
    url: "https://www.itftennis.com/en/news-and-media/articles/paris-2024-what-is-the-extreme-weather-policy/",
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
    url: "https://assets.ctfassets.net/761l7gh5x5an/716JED6hjzxjx4NJarMGnF/dd351ea31195ade0da04858b44d9e176/HIGH_TEMPERATURE_DURING_ROAD_CYCLING_EVENTS.pdf",
    kernaussage:
      "5-stufige WBGT-Skala, Hochrisiko-Schwelle bereits ab 28°C – strenger als die meisten anderen Verbände.",
    konfidenz: "hoch",
    einschraenkung:
      "Für Straßenrennen mit Windkühlung durch Fahrtgeschwindigkeit kalkuliert – bei sehr langsamer Fahrt (z.B. steile Anstiege) ggf. konservativer einzuschätzen.",
  },
  world_athletics: {
    id: "world_athletics",
    typ: "verbandsrichtlinie",
    name: "World Athletics Competition Medical Guidelines",
    organisation: "World Athletics",
    jahr: 2020,
    url: "https://worldathletics.org/download/download?filename=a20d107f-c682-48be-8c54-b4c3764de329.pdf&urlslug=World+Athletics+Competition+Medical+Guidelines+-+October+2020+Second+Edition",
    kernaussage:
      "Fünfstufige WBGT-Tabelle: unter 21 °C nahezu sicher, 21–25 °C Vorsicht, 25–28 °C Warnung, 28–30 °C starke Warnung, über 30 °C gefährlich. Der Verband weist zusätzlich darauf hin, dass das Risiko für Hitzeerkrankungen bereits über 21 °C und 50 % Luftfeuchte steigt.",
    konfidenz: "hoch",
    einschraenkung:
      "Für Straßenläufe nutzt World Athletics ein abweichendes Flaggensystem (grün <18, gelb 18–23, rot 23–28, schwarz >28 °C) – es gibt also nicht „die eine“ Tabelle. Bei der WM Tokio 2025 wurden die Straßenwettbewerbe der ersten drei Tage wegen erwarteter Hitze um 30 Minuten vorgezogen; der Verband nannte dabei keinen konkreten WBGT-Auslöser.",
  },
  acsm_general: {
    id: "acsm_general",
    typ: "wissenschaftliche_studie",
    name: "ACSM Position Stand: Exertional Heat Illness during Training and Competition",
    organisation: "Armstrong et al., Med Sci Sports Exerc 39(3):556–572",
    jahr: 2007,
    url: "https://doi.org/10.1249/mss.0b013e31802fa199",
    kernaussage:
      "Achtstufige WBGT-Tabelle für gesunde Erwachsene. Ab 18,4 °C steigt das Risiko für Vorbelastete, ab 22,3 °C für alle, ab 25,7 °C deutlich für Unfitte und Nichtakklimatisierte; ab 27,9 °C empfiehlt der Standard, Ausdauerwettkämpfe abzusagen oder zu verlegen.",
    konfidenz: "hoch",
    einschraenkung:
      "Der Standard betont selbst, dass lokales Klima und Akklimatisierungsgrad höhere Belastungen zulassen können. Für Kinder nennt er eine eigene Tabelle mit Abbruch über 29 °C – praktisch dieselbe Größenordnung wie bei Erwachsenen und kein Beleg für einen großen Alters-Offset. Die App setzt deshalb nur −1 °C als Vorsicht trotz schwacher Physiologie-Lage. Ältere Erwachsene behandelt sie getrennt (Quelle zu Hitzestress im Alter).",
  },
  aging_heat: {
    id: "aging_heat",
    typ: "wissenschaftliche_studie",
    name: "Heat stress vulnerability and critical environmental limits for older adults",
    organisation: "Meade et al., Commun Earth Environ 4:486; CDC Heat Health; Kenney",
    jahr: 2023,
    url: "https://doi.org/10.1038/s43247-023-01159-9",
    kernaussage:
      "Ab etwa 60 Jahren sinken Schweißrate und Hautdurchblutung, die kritischen Umweltgrenzen liegen niedriger als bei Jüngeren. CDC stuft Menschen ab 65 Jahren als Risikogruppe ein. Fitnesstragende, akklimatisierte Ältere können trotzdem ähnlich gut regulieren – das Alter allein erklärt nicht alles.",
    konfidenz: "mittel",
    einschraenkung:
      "Kein Verband nennt einen WBGT-Abzug in °C für Senioren. Die App setzt deshalb denselben kleinen Vorsichtsabzug wie bei unter 16-Jährigen (−1 °C) und sperrt die Leistungsstufe auf Breitensport.",
  },
  acsm_fallback_beachvolleyball: {
    id: "acsm_fallback_beachvolleyball",
    typ: "fallback_referenz",
    name: "ACSM-Skala als Fallback (FIVB nennt keine Schwelle)",
    kernaussage:
      "Die FIVB misst den WBGT vor jedem Spiel verpflichtend, verknüpft damit aber bewusst keine Grenzwerte oder Maßnahmen. Diese App nutzt deshalb die ACSM-Skala.",
    konfidenz: "niedrig",
    einschraenkung:
      "Die FIVB begründet den Verzicht mit ihrem eigenen Monitoring: trotz hoher WBGT-Werte bleibt die Zahl der Hitzeerkrankungen niedrig. Diese Beobachtung stammt jedoch von hitzeakklimatisierten Profis, die ihr Tempo selbst steuern – sie taugt nicht als Argument für gelockerte Werte im Breitensport. Der Fallback bleibt daher konservativ.",
  },
  fivb_studie_2012: {
    id: "fivb_studie_2012",
    typ: "wissenschaftliche_studie",
    name: "New guidelines are needed to manage heat stress in elite sports (FIVB Heat Stress Monitoring Programme)",
    organisation: "Bahr & Reeser, Br J Sports Med 46(11):805–809",
    jahr: 2012,
    url: "https://doi.org/10.1136/bjsports-2012-091102",
    kernaussage:
      "Über drei Saisons wurden 48 von 51 Welttour-Turnieren ausgewertet. In 9 Turnieren lag der Spitzen-WBGT über 32,3 °C; es gab genau einen hitzebedingten Rückzug – bei einem Spieler, dessen Flüssigkeitshaushalt durch eine dreitägige Magen-Darm-Erkrankung vorgeschädigt war.",
    konfidenz: "mittel",
    einschraenkung:
      "Beobachtungsstudie an Elite-Profis. Die 11-Jahres-Nachbetrachtung (Racinais et al. 2021) fand 20 hitzebedingte Auszeiten in 8.530 Spielen, davon 3 mit Aufgabe, und ein mit Temperatur steigendes Risiko. Kein Beleg dafür, dass Breitensportler:innen ähnlich tolerant sind.",
  },
  fih_air_temp: {
    id: "fih_air_temp",
    typ: "fallback_referenz",
    name: "FIH nutzt Lufttemperatur und Luftfeuchte statt WBGT",
    organisation: "International Hockey Federation, Inclement Weather Procedure",
    jahr: 2023,
    url: "https://www.fih.hockey/static-assets/pdf/fih-inclement-weather-procedure-2023.pdf",
    kernaussage:
      "Die FIH-Regel greift ab 35 °C Lufttemperatur an der Auswechselbank, wobei die Schwelle bei über 65 % Luftfeuchte gesenkt werden kann; eine zweite Stufe gilt ab 75 % Luftfeuchte oder über 42 °C auf dem Spielfeld. WBGT kommt darin nicht vor. Diese App zeigt trotzdem eine WBGT-Ampel (ACSM-Fallback), weil das gesamte System auf WBGT beruht.",
    konfidenz: "niedrig",
    einschraenkung:
      "Direkte Vergleichbarkeit mit der FIH-Regel ist NICHT gegeben – unterschiedliche Messgrößen.",
  },
  grundstein_cooper_2020: {
    id: "grundstein_cooper_2020",
    typ: "wissenschaftliche_studie",
    name: "Comparison of WBGTs over Different Surfaces within an Athletic Complex",
    organisation: "Grundstein & Cooper, Medicina 56(6):313",
    jahr: 2020,
    url: "https://doi.org/10.3390/medicina56060313",
    kernaussage:
      "Kein statistisch signifikanter WBGT-Unterschied zwischen Naturrasen, Kunstrasen und Hardcourt-Tennis: der Median lag mittags 0,06 °C, nachmittags rund 0,6 °C auseinander. Kunstrasen war zwar etwa 1 °C wärmer in der Lufttemperatur, aber rund 1 °C trockener im Taupunkt – im Index heben sich beide Effekte auf.",
    konfidenz: "mittel",
    einschraenkung:
      "Nur eine Klimazone (feucht-subtropisch, USA), und der Naturrasen-Vergleich war bewässert. Es gibt Gegenevidenz: Wardenaar et al. (2022) messen auf Kunstrasen einen signifikant um 2,2 °C höheren WBGT (27,5 vs. 25,3 °C) sowie höhere Globe-Temperatur und geringere Albedo. Eine Übersichtsarbeit (Int J Biometeorol 2024) bestätigt zwar mehrheitlich „kein Unterschied“, merkt aber an, dass nur zwei der Studien Feuchtkugel und Schwarzkugel korrekt gemessen haben. Deshalb gilt hier: kein Zahlenzuschlag, aber ein ausdrücklicher Warnhinweis zu Strahlungshitze und Kontaktverbrennungen.",
  },
  pryor_2017: {
    id: "pryor_2017",
    typ: "wissenschaftliche_studie",
    name: "The Heat Strain of Various Athletic Surfaces",
    organisation: "Pryor et al., J Athl Train 52(11):1056–1064",
    jahr: 2017,
    url: "https://doi.org/10.4085/1062-6050-52.11.15",
    kernaussage:
      "Vor Ort gemessene WBGT-Werte lagen signifikant über den aus Wetterstationsdaten modellierten: Asphalt-Tennisplatz +1,68 °C, rote Bahn +1,07 °C, schwarze Bahn +1,11 °C, Volleyballsand +0,99 °C. In 45 % der Fälle führte das zu einer falschen Sicherheitseinstufung, meist einer Stufe zu günstig.",
    konfidenz: "mittel",
    einschraenkung:
      "Zwischen den Sportbelägen selbst fand die Studie keine signifikanten Unterschiede – belegt ist also „Platz wärmer als Wetterstation“, nicht „Belag X wärmer als Belag Y“. Der blaue Betonplatz war nicht signifikant, Farbe und Bauweise zählen also mit. Ein Teil dieser Lücke entsteht durch die Modellrechnung selbst; diese App korrigiert die beiden bekanntesten Ursachen (natürliche Feuchtkugel, Windhöhe) und addiert deshalb keinen weiteren Aufschlag.",
  },
  john_2024_canopy: {
    id: "john_2024_canopy",
    typ: "wissenschaftliche_studie",
    name: "Forest canopy cover affects microclimate buffering during an extreme heat event",
    organisation: "John et al., Environmental Research Communications 6:091015",
    jahr: 2024,
    url: "https://doi.org/10.1088/2515-7620/ad7705",
    kernaussage:
      "Waldbereiche waren während einer Hitzewelle 3 °C kühler als eine gerodete Fläche und 4 °C kühler als die Region insgesamt – ein Beleg für den Kühleffekt von Baumschatten, der in dieser App über das Beschattungsfeld abgebildet wird und nicht über einen Untergrund-Offset.",
    konfidenz: "mittel",
    einschraenkung:
      "Gemessen wurde Lufttemperatur im Waldbestand, nicht WBGT, und zwar in nordamerikanischem Küstenwald während der Hitzekuppel 2021. Die 3–4 °C sind deshalb NICHT als WBGT-Abzug übertragbar: Schatten wirkt im WBGT vor allem über die Schwarzkugel, die nur 20 % wiegt. Ausgedünnte Bestände erreichten an den heißesten Tagen fast die Werte der Freifläche.",
  },
  irrigation_studies_turf: {
    id: "irrigation_studies_turf",
    typ: "wissenschaftliche_studie",
    name: "Bewässerung: Oberflächenkühlung belegt, WBGT-Effekt nicht",
    organisation: "u. a. Penn State SSRC; Commun Earth Environ 2024",
    url: "https://www.nature.com/articles/s43247-024-01959-7",
    kernaussage:
      "Bewässerung senkt die Oberflächentemperatur deutlich, hält aber kaum an: Penn State misst bereits nach 45–75 Minuten wieder über 50 °C. Für den WBGT gibt es keine Sportplatz-Studie; flächige Feldbewässerung senkt ihn tagsüber um 0,3–1,3 °C, hebt ihn nachts aber um 0,4–1,3 °C an, weil die zusätzliche Feuchte die Feuchtkugel steigen lässt.",
    konfidenz: "niedrig",
    einschraenkung:
      "Diese App rechnet deshalb nur 0,5 °C an, und das nur in der ersten Stunde, nur bei Sonne und nur unter 70 % Luftfeuchte. Der Wert ist eine bewusst vorsichtige Schätzung, kein belegter Messwert. Bei schwüler Luft kann Bewässerung den WBGT sogar erhöhen – dann greift der Abzug nicht.",
  },
  wbgt_model: {
    id: "wbgt_model",
    typ: "wissenschaftliche_studie",
    name: "WBGT-Schätzung aus Wetterdaten (Stull 2011; Hunter & Minyard 1999; FAO-56)",
    organisation: "J Appl Meteorol Climatol / US National Weather Service / FAO",
    jahr: 2011,
    url: "https://doi.org/10.1175/JAMC-D-11-0143.1",
    kernaussage:
      "Die App misst den WBGT nicht, sondern schätzt ihn: psychrometrische Feuchtkugel nach Stull (2011), Aufschlag auf die natürliche Feuchtkugel nach Hunter & Minyard (1999) wie beim US-Wetterdienst, Wind von 10 m auf 2 m nach FAO-56, Schwarzkugel über eine Strahlungs-Wind-Näherung.",
    konfidenz: "mittel",
    einschraenkung:
      "Referenzverfahren ist Liljegren et al. (2008) mit vollständiger Energiebilanz (RMSE < 1 °C). Unsere Näherung verzichtet auf die Iteration und liegt damit gröber; die Schwarzkugel-Näherung ist der unsicherste Schritt. Vor Ort gemessene Werte können abweichen, besonders bei Windstille und praller Sonne.",
  },
  acgih_tlv: {
    id: "acgih_tlv",
    typ: "wissenschaftliche_studie",
    name: "ACGIH Threshold Limit Values (TLV) for Heat Stress",
    organisation: "American Conference of Governmental Industrial Hygienists",
    url: "https://www.acgih.org/heat-stress-and-strain/",
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

export const WHY_THESE_VALUES_LABEL = "Warum diese Werte? →";
export const SOURCES_SECTION_ID = "quellen";
export const SOURCES_BLOCK_THRESHOLDS = "quellen-grenzwerte";
export const SOURCES_BLOCK_RECS = "quellen-empfehlungen";
export const SOURCES_BLOCK_SURFACE = "quellen-untergrund";

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
