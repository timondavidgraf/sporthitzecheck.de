import Link from "next/link";
import { BookOpen, ThermometerSun } from "lucide-react";
import { BrandHeader } from "@/lib/BrandHeader";

/**
 * 404-Seite für alle Adressen, die es nicht gibt – auch für gezielt
 * abgefragte Pfade wie /.git oder /.env, hinter denen nichts liegt.
 *
 * Next.js setzt für 404-Antworten selbst `noindex` und den Status 404. Einen
 * eigenen Titel gibt es nicht: not-found.tsx kann keine `metadata`
 * exportieren, und ein <title> im Markup stünde neben dem des Layouts.
 */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 lg:max-w-3xl">
      <div className="mb-6">
        <BrandHeader />
      </div>
      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Fehler 404
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Diese Seite gibt es nicht
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Die Adresse ist falsch geschrieben oder die Seite wurde verschoben. Ein
          geteilter Link zu einem Ergebnis führt immer auf „/prognose“ – fehlt
          dort etwas, einfach den Check neu starten.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98]"
          >
            <ThermometerSun className="size-4" aria-hidden />
            Zum Hitze-Check
          </Link>
          <Link
            href="/hintergrund"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
          >
            <BookOpen className="size-4" aria-hidden />
            Wie die App rechnet
          </Link>
        </div>
      </article>
    </main>
  );
}
