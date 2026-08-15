import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "./lib/sentryOptions";

Sentry.init({
  ...sentryPrivacyOptions(),
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
