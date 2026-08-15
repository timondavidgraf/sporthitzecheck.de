import { Bug, HeartHandshake, Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/legal";

export function FeedbackSupport({ pageLabel }: { pageLabel: string }) {
  const feedbackHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    "Feedback SportHitzeCheck"
  )}`;
  const bugHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Fehlerbericht SportHitzeCheck - ${pageLabel}`
  )}`;
  const supportHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    "Projekt unterstützen"
  )}`;

  return (
    <section>
      <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
        Feedback & Support
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a
          href={feedbackHref}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200"
        >
          <Mail className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Feedback geben</span>
        </a>
        <a
          href={bugHref}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200"
        >
          <Bug className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Fehler melden</span>
        </a>
        <a
          href={supportHref}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200"
        >
          <HeartHandshake className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Projekt unterstützen</span>
        </a>
      </div>
    </section>
  );
}
