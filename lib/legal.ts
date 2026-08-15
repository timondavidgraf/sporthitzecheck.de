/** Rechtlicher Hinweis – auf Formular und Ergebnisseite identisch. */
export const LEGAL_DISCLAIMER =
  "Diese App bietet eine Orientierungshilfe. Der WBGT nähert die Hitzebelastung besser an als die Lufttemperatur allein, weil er Feuchte, Sonnenstrahlung und Wind einbezieht. Ein Modell kann die Bedingungen auf dem Platz trotzdem nicht vollständig abbilden. Die finale Entscheidung obliegt der Spielleitung bzw. dem Trainerstab vor Ort.";

/** Einzige Kontaktadresse für Feedback, Fehler und Impressum. */
export const CONTACT_EMAIL = "team@sporthitzecheck.de";

/** Kurztext für den (i)-Tooltip neben der WBGT-Angabe. */
export const WBGT_EXPLAINER =
  "WBGT (Wet Bulb Globe Temperature) fasst Lufttemperatur, Feuchte, Sonnenstrahlung und Wind zusammen. Die Lufttemperatur allein unterschätzt die Belastung, wenn es schwül ist oder die Sonne auf den Platz brennt – der Körper kann dann schlechter über Schweiß abkühlen. Deshalb gilt WBGT im Sport als das bessere Hitze-Maß (FIFA, ACSM, NATA).";

export const LEGAL_OPERATOR = {
  name: "Timon Graf",
  addition: "Entfaltungszone",
  street: "Bahnhofstraße 60",
  zipCity: "72250 Freudenstadt",
  email: CONTACT_EMAIL,
} as const;
