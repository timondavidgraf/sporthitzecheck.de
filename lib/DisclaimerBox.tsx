import { AlertTriangle } from "lucide-react";
import { LEGAL_DISCLAIMER } from "@/lib/legal";

export function DisclaimerBox() {
  return (
    <section
      role="note"
      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-slate-100 p-4 shadow-sm"
    >
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-slate-600"
        aria-hidden
      />
      <p className="text-sm leading-relaxed text-slate-700">{LEGAL_DISCLAIMER}</p>
    </section>
  );
}
