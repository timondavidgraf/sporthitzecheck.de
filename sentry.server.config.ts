import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "./lib/sentryOptions";

/**
 * Server-Init für Sentry.
 * sendDefaultPii: false – keine IP-Adressen oder anderen Identifikatoren (DSGVO).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    ...sentryPrivacyOptions(),
    sendDefaultPii: false,
  });
}
