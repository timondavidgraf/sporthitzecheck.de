"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT_EMAIL } from "@/lib/legal";

const HINT_MS = 4000;

export function EmailCopiedHint() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
    >
      Die E-Mail-Adresse wurde in die Zwischenablage kopiert.
    </p>
  );
}

export function MailToLink({
  children,
  className,
  showStatus = true,
  onCopied,
}: {
  children: React.ReactNode;
  className?: string;
  showStatus?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const hideTimer = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <button
        type="button"
        className={`h-full w-full cursor-pointer text-left ${className ?? ""}`}
        onClick={() => {
          void navigator.clipboard
            .writeText(CONTACT_EMAIL)
            .then(() => {
              onCopied?.();
              if (!showStatus) return;
              setCopied(true);
              window.clearTimeout(hideTimer.current);
              hideTimer.current = window.setTimeout(() => setCopied(false), HINT_MS);
            })
            .catch(() => {
              window.location.href = `mailto:${CONTACT_EMAIL}`;
            });
        }}
      >
        {children}
      </button>
      {showStatus && copied ? (
        <div className="mt-2">
          <EmailCopiedHint />
        </div>
      ) : null}
    </div>
  );
}
