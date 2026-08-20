import type { ErrorEvent } from "@sentry/nextjs";
import type { HttpBodyCollectionTarget } from "@sentry/core";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
const noHttpBodies: HttpBodyCollectionTarget[] = [];

/** Browser-Netzfehler ohne Stack – Prefetch, Adblocker, Offline, Abbruch. */
function isGenericNetworkError(event: ErrorEvent): boolean {
  return (event.exception?.values ?? []).some((value) => {
    const message = (value.value ?? "").trim();
    if (value.type === "AbortError") return true;
    if (value.type !== "TypeError") return false;
    return (
      message === "Failed to fetch" ||
      message === "Load failed" ||
      message === "cancelled" ||
      message === "NetworkError when attempting to fetch resource." ||
      message === "NetworkError when attempting to fetch resource"
    );
  });
}

/** Gemeinsame Sentry-Optionen: Fehler + Tracing, keine Identifikatoren (DSGVO). */
export function sentryPrivacyOptions() {
  return {
    dsn,
    enabled: Boolean(dsn),
    sendDefaultPii: false as const,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: noHttpBodies,
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    beforeSend(event: ErrorEvent) {
      // Kein App-Code im Stack, nur der globale Handler: kein Bug, den wir beheben können.
      if (isGenericNetworkError(event) && !event.tags?.feature) {
        return null;
      }
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
        delete event.user.username;
        delete event.user.geo;
        delete event.user.id;
      }
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.env;
        delete event.request.data;
        delete event.request.query_string;
        // Die Radar-URL trägt Koordinaten im Query-String – nur den Pfad behalten
        if (typeof event.request.url === "string") {
          event.request.url = event.request.url.split("?")[0];
        }
      }
      return event;
    },
  };
}
