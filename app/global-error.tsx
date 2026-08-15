"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center text-slate-800">
        <p className="text-base font-semibold">Etwas ist schiefgelaufen.</p>
        <p className="text-sm text-gray-500">Bitte die Seite neu laden oder später erneut versuchen.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
