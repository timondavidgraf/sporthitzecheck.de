import type { ErrorEvent } from "@sentry/nextjs";
import type { HttpBodyCollectionTarget } from "@sentry/core";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
const noHttpBodies: HttpBodyCollectionTarget[] = [];

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
      }
      return event;
    },
  };
}
