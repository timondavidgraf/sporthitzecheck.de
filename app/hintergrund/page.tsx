import type { Metadata } from "next";
import { ExternalLink, Mail } from "lucide-react";
import { LegalShell } from "@/lib/LegalShell";
import { MailToLink } from "@/lib/MailToLink";
import { LINKEDIN_URL, LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Hintergrund – SportHitzeCheck",
  description:
    "Warum SportHitzeCheck entstanden ist und was der WBGT über Hitzebelastung im Sport aussagt.",
};

export default function HintergrundPage() {
  return (
    <LegalShell title="Hintergrund">
      <section>
        <h2 className="text-base font-bold text-slate-900">Warum es diese App gibt</h2>
        <p className="mt-1.5">
          Ich bin Amateurfußballer. An heißen Spieltagen reicht ein Blick auf die
          Lufttemperatur oft nicht: Schwüle, pralle Sonne auf Kunstrasen und fehlender
          Schatten machen denselben Gradwert zu einer ganz anderen Belastung. Gleichzeitig
          bleiben die Vorgaben der Verbände für den Breitensport häufig unscharf – „bei
          Hitze Pausen einlegen“, ohne eine gemeinsame, nachvollziehbare Messgröße.
        </p>
        <p>
          In meiner Masterarbeit habe ich mich mit Klimaanpassung in
          Amateurfußballvereinen in Baden-Württemberg beschäftigt. Als Referent in der
          Vereinsmanagerausbildung des Südbadischen Fußballverbands (SBFV) treffe ich
          regelmäßig auf Vereinsverantwortliche, die Entscheidungen vor Ort treffen
          müssen – oft ohne medizinische Abteilung an der Linie und ohne klare Ampel.
        </p>
        <p>
          SportHitzeCheck ist der Versuch, genau diese Lücke zu schließen: eine
          kostenfreie Orientierungshilfe, die den WBGT nutzbar macht, Platzbedingungen
          einbezieht und bewusst früher warnt als Schwellen aus dem akklimatisierten
          Profibereich. Die Entscheidung bleibt bei der Spielleitung und dem Trainerstab
          vor Ort.
        </p>
        <p className="text-slate-500">
          {LEGAL_OPERATOR.name}, {LEGAL_OPERATOR.addition}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">Was der WBGT misst</h2>
        <p className="mt-1.5">
          WBGT steht für Wet Bulb Globe Temperature (Feuchtkugel-Globe-Temperatur). Es
          ist kein zweiter Name für die Lufttemperatur, sondern eine Näherung der
          Hitzebelastung, der der Körper ausgesetzt ist. Die Formel im Freien gewichtet
          drei Größen:
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            <strong>Feuchtkugeltemperatur (Tw)</strong> – wie gut Schweiß verdunsten
            kann. Hohe Luftfeuchte drückt die Kühlleistung; dieser Anteil zählt am
            stärksten (70&nbsp;%).
          </li>
          <li>
            <strong>Schwarzkugeltemperatur (Tg)</strong> – Strahlungshitze von Sonne und
            Untergrund, gemildert durch Wind (20&nbsp;%).
          </li>
          <li>
            <strong>Lufttemperatur (Ta)</strong> – nur ein Zehntel der Formel
            (10&nbsp;%).
          </li>
        </ul>
        <p>
          Deshalb kann der WBGT deutlich unter der Lufttemperatur liegen und trotzdem die
          relevantere Zahl sein: Bei 32&nbsp;°C Luft und hoher Feuchte plus Sonne auf
          Kunstrasen ist die Belastung höher, als die 32&nbsp;°C allein vermuten lassen.
          FIFA, ACSM und NATA nutzen den WBGT deshalb als Maß für Hitze im Sport.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">Was SportHitzeCheck daraus macht</h2>
        <p className="mt-1.5">
          Die Wetterdaten kommen von Open-Meteo. Daraus entsteht eine WBGT-Näherung, die
          Beschattung, Untergrund und eine eventuelle Bewässerung berücksichtigt.
          Altersklassen verschieben die Ampelschwellen, nicht den Wetterwert selbst:
          Kinder schwitzen weniger effizient, im Amateursport fehlt oft die
          Hitzeakklimatisierung.
        </p>
        <p>
          Ein Modell kann Mikroklima, individuelle Verfassung und die konkrete Belastung
          nicht vollständig abbilden. Die App ersetzt keine medizinische Einschätzung und
          keine Entscheidung vor Ort – sie soll sie vorbereiten.
        </p>
      </section>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MailToLink className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200">
          <Mail className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">Kontakt</span>
        </MailToLink>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200"
        >
          <ExternalLink className="size-5 shrink-0 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-slate-800">LinkedIn</span>
        </a>
      </div>
    </LegalShell>
  );
}
