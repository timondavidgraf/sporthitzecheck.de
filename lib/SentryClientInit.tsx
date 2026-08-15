"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "@/lib/sentryOptions";

/**
 * Zusätzliche Client-Absicherung: Sentry startet nur im Browser
 * und nur, wenn eine DSN gesetzt ist. Die eigentliche Init-Datei
 * ist sentry.client.config.ts (wird von Next.js automatisch geladen).
 */
export function SentryClientInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    if (Sentry.getClient()) return;

    Sentry.init({
      ...sentryPrivacyOptions(),
      sendDefaultPii: false,
    });
  }, []);

  return null;
}
