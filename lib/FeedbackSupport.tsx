"use client";

import { useEffect, useRef, useState } from "react";
import { Bug, HeartHandshake, Mail } from "lucide-react";
import { EmailCopiedHint, MailToLink } from "@/lib/MailToLink";

const HINT_MS = 4000;

const cardClass =
  "flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200";

export function FeedbackSupport({ pageLabel: _pageLabel }: { pageLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const hideTimer = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  const markCopied = () => {
    setCopied(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setCopied(false), HINT_MS);
  };

  return (
    <section>
      <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
        Feedback & Support
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MailToLink className={cardClass} showStatus={false} onCopied={markCopied}>
          <Mail className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Feedback geben</span>
        </MailToLink>
        <MailToLink className={cardClass} showStatus={false} onCopied={markCopied}>
          <Bug className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Fehler melden</span>
        </MailToLink>
        <MailToLink className={cardClass} showStatus={false} onCopied={markCopied}>
          <HeartHandshake className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Projekt unterstützen</span>
        </MailToLink>
      </div>
      {copied ? (
        <div className="mt-3">
          <EmailCopiedHint />
        </div>
      ) : null}
    </section>
  );
}
