/**
 * Google-Maps-Status (und eigene Codes) → deutsche, handlungsfähige Meldung.
 * Keine Google-error_message durchreichen – die kann interne Hinweise enthalten.
 */
export function messageForGoogleStatus(status: string): string {
  switch (status) {
    case "ZERO_RESULTS":
    case "not-found":
      return "Ort konnte über Google Maps nicht gefunden werden. Bitte Vereinsname oder Adresse anders formulieren.";
    case "OVER_QUERY_LIMIT":
      return "Das Google-Maps-Kontingent ist aufgebraucht. Bitte später erneut versuchen oder den aktuellen Standort nutzen.";
    case "RATE_LIMITED":
      return "Zu viele Suchanfragen in kurzer Zeit. Bitte kurz warten.";
    case "REQUEST_DENIED":
    case "missing-key":
      return "Die Ortssuche ist nicht verfügbar. Bitte den aktuellen Standort nutzen oder später erneut versuchen.";
    case "INVALID_REQUEST":
      return "Die Sucheingabe ist ungültig. Bitte Vereinsname oder Adresse eingeben.";
    case "UNKNOWN_ERROR":
    case "lookup-failed":
    default:
      return "Google Maps ist gerade nicht erreichbar. Bitte Verbindung prüfen oder den aktuellen Standort nutzen.";
  }
}

export function isGoogleQuotaOrOutage(status: string): boolean {
  return (
    status === "OVER_QUERY_LIMIT" ||
    status === "RATE_LIMITED" ||
    status === "REQUEST_DENIED" ||
    status === "missing-key" ||
    status === "UNKNOWN_ERROR" ||
    status === "lookup-failed"
  );
}
