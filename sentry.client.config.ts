import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "./lib/sentryOptions";

/**
 * Client-Init für Sentry. Läuft nur im Browser und nur mit gesetzter DSN.
 * sendDefaultPii: false – keine IP-Adressen oder anderen Identifikatoren (DSGVO).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (typeof window !== "undefined" && dsn) {
  Sentry.init({
    ...sentryPrivacyOptions(),
    sendDefaultPii: false,
  });
}
