/** Rechtlicher Hinweis – auf Formular und Ergebnisseite identisch. */
export const LEGAL_DISCLAIMER =
  "Diese App liefert eine WBGT-Näherung aus Wetterdaten (Open-Meteo) und öffentlich zugänglichen Verbandsrichtlinien. WBGT bildet Feuchte, Strahlung und Wind mit ab und liegt näher an der Hitzebelastung als die Lufttemperatur allein. Das Modell ersetzt keine Vor-Ort-Messung, keine medizinische Beratung und keine Entscheidung von Spielleitung, Trainerstab oder Schiedsgericht. Bei gesundheitlichen Symptomen: sofort abbrechen und kühlen.";

/**
 * Kanonische Adresse der Seite – Basis für Canonical-Links, Open Graph,
 * robots.txt und sitemap.xml. Über `NEXT_PUBLIC_SITE_URL` überschreibbar,
 * damit Vorschau-Deployments nicht auf die Produktionsdomain zeigen.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sporthitzecheck.de"
).replace(/\/$/, "");

/** Einzige Kontaktadresse für Feedback, Fehler und Impressum. */
export const CONTACT_EMAIL = "team@sporthitzecheck.de";
export const LINKEDIN_URL = "https://www.linkedin.com/in/timon-graf-503bb4186/";

/** Kurztext für den (i)-Tooltip neben der WBGT-Angabe. */
export const WBGT_EXPLAINER =
  "WBGT (Wet Bulb Globe Temperature) fasst Lufttemperatur, Feuchte, Sonnenstrahlung und Wind zusammen. Die Lufttemperatur allein unterschätzt die Belastung, wenn es schwül ist oder die Sonne auf den Platz brennt – der Körper kann dann schlechter über Schweiß abkühlen. Deshalb gilt WBGT im Sport als das bessere Hitze-Maß (FIFA, ACSM, NATA).";

export const WBGT_CALCULATED_NOTE =
  "Der Wert hier ist berechnet, nicht gemessen: Grundlage sind Wetterdaten und eine Näherungsformel, nicht drei Sensoren an der Seitenlinie. Eine Vor-Ort-Messung kann deshalb abweichen – die Ampel ist eine Orientierung, kein Messprotokoll.";

export const LEGAL_OPERATOR = {
  name: "Timon Graf",
  addition: "Entfaltungszone",
  street: "Bahnhofstraße 60",
  zipCity: "72250 Freudenstadt",
  email: CONTACT_EMAIL,
} as const;
