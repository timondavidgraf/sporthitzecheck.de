import type { ErrorEvent } from "@sentry/nextjs";

/** Gemeinsame Sentry-Optionen: keine IP, keine Identifikatoren. */
export function sentryPrivacyOptions() {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN),
    sendDefaultPii: false as const,
    tracesSampleRate: 0.05,
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
