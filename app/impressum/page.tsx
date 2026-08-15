import type { Metadata } from "next";
import { LegalShell } from "@/lib/LegalShell";
import { LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum – SportHitzeCheck",
  description: "Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).",
};

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <p>
        Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Medienstaatsvertrag
        (MStV).
      </p>

      <section>
        <h2 className="text-base font-bold text-slate-900">Diensteanbieter</h2>
        <p className="mt-1.5 whitespace-pre-line">
          {LEGAL_OPERATOR.name}
          {"\n"}
          {LEGAL_OPERATOR.addition}
          {"\n"}
          {LEGAL_OPERATOR.street}
          {"\n"}
          {LEGAL_OPERATOR.zipCity}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">Kontakt</h2>
        <p className="mt-1.5">
          E-Mail:{" "}
          <a
            href={`mailto:${LEGAL_OPERATOR.email}`}
            className="font-medium text-orange-700 underline decoration-orange-200 underline-offset-2"
          >
            {LEGAL_OPERATOR.email}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">
          Verantwortlich für den Inhalt
        </h2>
        <p className="mt-1.5">
          Verantwortlich nach § 18 Abs. 2 MStV: {LEGAL_OPERATOR.name} (
          {LEGAL_OPERATOR.addition}), {LEGAL_OPERATOR.street},{" "}
          {LEGAL_OPERATOR.zipCity}.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">Haftung für Inhalte</h2>
        <p className="mt-1.5">
          SportHitzeCheck ist eine kostenfreie Orientierungshilfe zur Einschätzung
          der Hitzebelastung im Sport. Die dargestellten WBGT-Werte und Empfehlungen
          ersetzen keine Entscheidung vor Ort und keine medizinische Beratung. Es
          wird keine Gewähr für Vollständigkeit, Aktualität oder Eignung im
          Einzelfall übernommen.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">Haftung für Links</h2>
        <p className="mt-1.5">
          Diese Website enthält Links zu externen Angeboten (unter anderem
          OpenStreetMap, wissenschaftliche Quellen). Auf deren Inhalte haben wir
          keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der
          jeweilige Anbieter verantwortlich.
        </p>
      </section>
    </LegalShell>
  );
}
