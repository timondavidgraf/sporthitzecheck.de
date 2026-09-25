import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import type { HttpBodyCollectionTarget, TransactionEvent } from "@sentry/core";

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

/**
 * Query-String entfernen. Ergebnis-URL und Open-Meteo-Aufruf tragen die
 * Koordinaten im Query – die dürfen weder über Breadcrumbs noch über
 * Performance-Spans bei Sentry landen. `urlQueryParams: false` greift nur bei
 * eingehenden Server-Requests, nicht bei Browser-Fetches und Navigationen.
 */
function stripQuery(value: unknown): unknown {
  return typeof value === "string" ? value.split("?")[0] : value;
}

const URL_DATA_KEYS = ["url", "from", "to", "http.url", "url.full"] as const;
const QUERY_DATA_KEYS = ["http.query", "url.query"] as const;

function scrubUrlData(data: Record<string, unknown> | undefined) {
  if (!data) return;
  for (const key of URL_DATA_KEYS) {
    if (key in data) data[key] = stripQuery(data[key]);
  }
  for (const key of QUERY_DATA_KEYS) delete data[key];
}

function scrubRequest(event: ErrorEvent | TransactionEvent) {
  if (!event.request) return;
  delete event.request.cookies;
  delete event.request.headers;
  delete event.request.env;
  delete event.request.data;
  delete event.request.query_string;
  event.request.url = stripQuery(event.request.url) as string | undefined;
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
      scrubRequest(event);
      event.breadcrumbs?.forEach((crumb) => scrubUrlData(crumb.data));
      return event;
    },
    beforeBreadcrumb(breadcrumb: Breadcrumb) {
      scrubUrlData(breadcrumb.data);
      return breadcrumb;
    },
    beforeSendTransaction(event: TransactionEvent) {
      scrubRequest(event);
      scrubUrlData(event.contexts?.trace?.data as Record<string, unknown> | undefined);
      for (const span of event.spans ?? []) {
        // z. B. "GET https://api.open-meteo.com/v1/forecast?latitude=…"
        if (span.description) span.description = stripQuery(span.description) as string;
        scrubUrlData(span.data as Record<string, unknown> | undefined);
      }
      return event;
    },
  };
}
