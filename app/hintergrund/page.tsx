import type { Metadata } from "next";
import { ExternalLink, Mail } from "lucide-react";
import { LegalShell } from "@/lib/LegalShell";
import { MailToLink } from "@/lib/MailToLink";
import { LINKEDIN_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Hintergrund",
  description:
    "Warum SportHitzeCheck entstanden ist, was der WBGT über Hitzebelastung im Sport aussagt und wie belastbar die verwendeten Daten sind.",
  alternates: { canonical: "/hintergrund" },
  openGraph: {
    title: "Hintergrund – SportHitzeCheck",
    url: "/hintergrund",
  },
};

export default function HintergrundPage() {
  return (
    <LegalShell title="Hintergrund">
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-slate-900">Warum es diese App gibt</h2>
        <p>
          30&nbsp;°C sind nicht 30&nbsp;°C. Trockene Luft im Halbschatten ist eine
          andere Belastung als dieselbe Anzeige bei hoher Feuchte, praller Sonne und
          aufgeheiztem Platz. Für den Breitensport bleiben die Vorgaben trotzdem meist
          unscharf – „bei Hitze Pausen einlegen“, ohne gemeinsame Messgröße und ohne
          Schwelle, auf die sich beide Mannschaften und die Spielleitung berufen können.
        </p>
        <p>
          Der Hintergrund dieser App ist eine Masterarbeit zur Klimaanpassung in
          Amateurfußballvereinen in Baden-Württemberg, die Arbeit als Referent in der
          Vereinsmanagerausbildung des Südbadischen Fußballverbands (SBFV) und viele
          eigene Jahre auf dem Platz. In dieser Ausbildung sitzen genau die Menschen, die
          bei Hitze entscheiden müssen: Vereinsverantwortliche und Trainerteams, meist
          ohne medizinische Abteilung an der Seitenlinie.
        </p>
        <p>
          SportHitzeCheck macht den WBGT für diese Situation nutzbar: kostenfrei, ohne
          Anmeldung, mit Platzbedingungen und bewusst früheren Warnstufen als sie für
          akklimatisierte Profis gelten. Die Entscheidung bleibt vor Ort.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-slate-900">Was der WBGT misst</h2>
        <p>
          WBGT steht für Wet Bulb Globe Temperature (Feuchtkugel-Globe-Temperatur) und
          ist der international etablierte Hitze-Index für Arbeit und Sport im Freien
          (Grundlage: ISO&nbsp;7243). Er beschreibt nicht die Luft, sondern wie schwer es
          dem Körper fällt, seine Wärme loszuwerden. Die Außen-Formel gewichtet drei
          Größen sehr ungleich:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Natürliche Feuchtkugeltemperatur (Tnw), 70&nbsp;%</strong> – wie gut
            Schweiß verdunsten kann. Der Körper kühlt fast ausschließlich über
            Verdunstung; ist die Luft schon feucht, fällt dieser Weg weg. Deshalb wiegt
            dieser Anteil am schwersten. „Natürlich“ heißt: der feuchte Docht steht
            unbeschirmt in Sonne und Wind – nicht im Schatten wie beim Feuchtkugelwert
            einer Wetterstation.
          </li>
          <li>
            <strong>Schwarzkugeltemperatur (Tg), 20&nbsp;%</strong> – Strahlungshitze von
            Sonne, Himmel und Untergrund, abgemildert durch Wind.
          </li>
          <li>
            <strong>Lufttemperatur (Ta), 10&nbsp;%</strong> – die Zahl aus der
            Wetter-App, hier nur ein Zehntel des Ergebnisses.
          </li>
        </ul>
        <p>
          Aus dieser Gewichtung folgt das Verhalten, das zunächst irritiert: Der WBGT
          liegt in Mitteleuropa meist deutlich unter der Lufttemperatur und ist trotzdem
          die aussagekräftigere Zahl. Ein schwüler, windstiller Nachmittag bei
          28&nbsp;°C kann kritischer sein als ein trockener, luftiger Tag bei
          32&nbsp;°C. FIFA, ACSM, NATA, UCI und ITF stützen ihre Hitzeregeln deshalb auf
          den WBGT, nicht auf die Lufttemperatur.
        </p>
        <p>
          Wichtig zur Einordnung: Ein echter WBGT wird mit drei Sensoren am Platz
          gemessen. Diese App <strong>berechnet</strong> die drei Anteile aus
          Wetterdaten (Temperatur, Feuchte, Wind, Direkt- und Diffusstrahlung). Das ist
          gut genug, um eine Einheit zu planen oder zu verschieben – es ist keine
          Messung an der Seitenlinie.
        </p>
        <p>
          Zwei Details entscheiden dabei über die Größenordnung, und beide werden in
          vielen einfachen WBGT-Rechnern übersehen. Erstens: Aus Temperatur und Feuchte
          ergibt sich zunächst nur die <em>psychrometrische</em> Feuchtkugel – der Wert
          im Schatten. Für den WBGT braucht es den unbeschirmten Docht, der zusätzlich
          von der Sonne aufgeheizt wird. Diese App rechnet den Aufschlag nach dem
          Verfahren, das der US-Wetterdienst in seiner WBGT-Vorhersage nutzt – in der
          überarbeiteten Fassung, weil die ältere Formel von Hunter &amp; Minyard (1999)
          gegenüber Messungen zu niedrig lag. Zweitens: Wetterdaten liefern Wind auf
          10&nbsp;Meter Höhe, gekühlt wird der Körper aber auf zwei Metern. Wer den
          10-Meter-Wind direkt einsetzt, rechnet zu viel Kühlung ein. Beides zusammen
          würde den WBGT bei Sonne um etwa 2–3&nbsp;°C zu niedrig ausweisen – also
          genau in die gefährliche Richtung.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-slate-900">Wie belastbar sind die Zahlen?</h2>
        <p>
          Nicht alles in dieser App ist gleich gut belegt, und das soll sichtbar bleiben.
          Auf der Ergebnisseite steht hinter jedem Wert die Quelle samt Konfidenz, im
          Abschnitt „Medizinische Grundlagen &amp; Quellen“. Die Kurzfassung:
        </p>

        <h3 className="mt-1 text-sm font-bold text-slate-800">
          Gut belegt: veröffentlichte Verbandsschwellen
        </h3>
        <p>
          Diese Werte sind unverändert übernommen, inklusive ihrer Herkunft aus dem
          Profibetrieb:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Fußball:</strong> FIFA – vier Risikostufen (niedrig unter
            24&nbsp;°C, moderat 24–29&nbsp;°C, hoch 30–32&nbsp;°C, extrem über
            32&nbsp;°C). Verpflichtende Cooling Breaks hängen erst an der obersten
            Stufe. Die Richtlinie ist rund zwanzig Jahre alt und gilt in der
            Sportmedizin als weniger schützend als die Vorgaben anderer Verbände;
            FIFPRO fordert Cooling Breaks ab 26 und Verlegung ab 28&nbsp;°C. Beide
            Sichtweisen stehen auf der Ergebnisseite.
          </li>
          <li>
            <strong>Tennis:</strong> ITF – zusätzliche Pause ab 30,1&nbsp;°C,
            Unterbrechungs-Richtwert 32,2&nbsp;°C.
          </li>
          <li>
            <strong>Radsport:</strong> UCI – fünfstufige Skala, Hochrisiko ab 28&nbsp;°C.
            Der strengste Katalog überhaupt, allerdings mit Fahrtwind kalkuliert.
          </li>
          <li>
            <strong>Grundlage der Ampel:</strong> ACSM Position Stand zu
            Hitzeerkrankungen (2007) – acht Stufen für gesunde Erwachsene: ab
            18,4&nbsp;°C steigt das Risiko für Vorbelastete, ab 22,3&nbsp;°C für alle,
            ab 27,9&nbsp;°C empfiehlt der Standard, Ausdauerwettkämpfe abzusagen.
            Referenz für alle Sportarten ohne eigenen Verbandswert.
          </li>
          <li>
            <strong>Leichtathletik:</strong> World Athletics veröffentlicht fünf Stufen –
            unter 21&nbsp;°C nahezu sicher, 21–25&nbsp;°C Vorsicht, 25–28&nbsp;°C
            Warnung, 28–30&nbsp;°C starke Warnung, über 30&nbsp;°C gefährlich. Für
            Straßenläufe gilt ein abweichendes Flaggensystem; unsere Werte beziehen sich
            auf Stadionwettbewerbe.
          </li>
        </ul>

        <h3 className="mt-1 text-sm font-bold text-slate-800">
          Mittlere Konfidenz: Studien, die übertragen werden müssen
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Kunstrasen:</strong> Hier ist die Studienlage
            <em> widersprüchlich</em>, und das steht so in der App. Grundstein &amp;
            Cooper (2020) finden keinen signifikanten WBGT-Unterschied zu Naturrasen: die
            höhere Strahlung wird durch trockenere Luft gegengerechnet. Wardenaar et al.
            (2022) messen dagegen +2,2&nbsp;°C. Eine Übersichtsarbeit von 2024 stützt
            mehrheitlich „kein Unterschied“, merkt aber an, dass nur zwei Studien
            Feuchtkugel und Schwarzkugel korrekt gemessen haben. Konsequenz: kein
            Zahlenzuschlag, weil die Richtung nicht gesichert ist – aber ein
            ausdrücklicher Warnhinweis, denn 50–75&nbsp;°C Oberflächentemperatur
            (Gummi-Infill am heißesten) und Kontaktverbrennungen sind unbestritten.
            Infill ändert vor allem die Oberfläche und die Strahlung auf Knöchelhöhe,
            kaum den WBGT in Brusthöhe: trockene Hitze auf Kunstrasen und Schwüle auf
            Naturrasen können denselben Index liefern. Kork kann Wasser halten und dann
            per Verdunstung kühlen; bei Gummi-Granulat fließt Wasser ab. Die Ampel
            unterscheidet die Infills in der Zahl deshalb nicht.
          </li>
          <li>
            <strong>Hardcourt, Tartan, Tiefsand:</strong> Pryor et al. (2017) messen vor
            Ort 1,0–1,7&nbsp;°C höhere WBGT-Werte als aus Wetterstationsdaten berechnet –
            in 45&nbsp;% der Fälle führte das zu einer zu günstigen Einstufung. Wichtig:
            Zwischen den Belägen selbst fand die Studie keine signifikanten Unterschiede.
            Belegt ist also „Platz wärmer als Wetterstation“, nicht „Belag X wärmer als
            Belag Y“. Die Zuschläge der App sind deshalb ein vorsichtiger
            Vor-Ort-Aufschlag, keine validierte Rangfolge – und stehen nur bei den
            Belagstypen, die Pryor tatsächlich gemessen hat. Eine Messreihe auf
            Tennisplätzen in Japan (Sci Rep 2024) bestätigt die Größenordnung für
            Hardcourt (etwa +1&nbsp;°C) und fand auf einem Platz aus Granitboden –
            vergleichbar mit Asche – nur bei extremer Hitze mittags einen kleinen
            Aufschlag. Asche und Ziegelmehl bekommen deshalb einen Warnhinweis statt
            einer Zahl.
          </li>
          <li>
            <strong>Waldschatten:</strong> John et al. (2024) messen im Wald 3–4&nbsp;°C
            niedrigere <em>Luft</em>temperatur. Als WBGT-Abzug ist das nicht übertragbar,
            weil Schatten vor allem über die Schwarzkugel wirkt – und die wiegt nur
            20&nbsp;%. Deshalb läuft Schatten über das Beschattungsfeld und nicht als
            Untergrundbonus.
          </li>
          <li>
            <strong>65 Jahre und älter (extra −1&nbsp;°C):</strong> die Richtung ist
            besser belegt als bei Kindern. Ab etwa 60 Jahren sinken Schweißrate und
            Hautdurchblutung, die kritischen Umweltgrenzen liegen niedriger (Kenney;
            Meade et al. 2023). CDC stuft Menschen ab 65 Jahren als Risikogruppe ein.
            Fitnesstragende, akklimatisierte Masters-Athleten können trotzdem ähnlich
            gut regulieren – das Alter allein erklärt nicht alles. Im Labor lag die
            Grenze, ab der der Körper Wärme nicht mehr abgeben kann, bei Älteren um
            rund 2–3&nbsp;°C WBGT tiefer (Wolf et al. 2023, leichte Aktivität, ohne
            Sonne). Kein Verband nennt einen °C-Abzug; die −1&nbsp;°C sind bewusst
            vorsichtig gesetzt und gelten bei allen Sportarten, auch auf der ACSM-Skala.
          </li>
          <li>
            <strong>Leistungsstufe (−2&nbsp;°C Breitensport, 0&nbsp;°C Professionell / Akklimatisiert):</strong>
            {" "}
            FIFA, ITF, UCI und World Athletics formulieren ihre Schwellen für den
            Profibetrieb. Der ACSM Position Stand (Armstrong et al. 2007, Tabelle 2)
            setzt dieselben Maßnahmen für nicht akklimatisierte, weniger fitte Personen
            rund 2&nbsp;°C früher an – Abbruch bei 30,1 statt 32,3&nbsp;°C. Daraus kommt
            der Abzug, kein Verbandswert. Nur bei 16–64 Jahren wählbar; unter 16 und 65+
            bleibt das Feld auf Breitensport.
          </li>
        </ul>

        <h3 className="mt-1 text-sm font-bold text-slate-800">
          Bewusste Näherung: hier ist die Konfidenz niedrig
        </h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Intensität (±1,5&nbsp;°C):</strong> abgeleitet aus dem
            arbeitsmedizinischen ACGIH-Modell, das Grenzwerte nach Belastung und
            Pausenanteil staffelt. Entwickelt für Industriearbeit, nicht für Sport
            validiert – eine Analogie, keine Übernahme.
          </li>
          <li>
            <strong>Unter 16 Jahren (extra −1&nbsp;°C):</strong> Vorsicht, keine
            Physiologie. Die American Academy of Pediatrics (2011, bestätigt 2019) und
            Notley et al. (BJSM 2025) zeigen vergleichbare Kerntemperaturen bei Kindern
            und Erwachsenen, sofern Flüssigkeit verfügbar ist. Der ACSM führt Kinder
            trotzdem als Risikogruppe – Aufsicht und Belastungsteuerung im Verein. Der
            Abzug bleibt deshalb klein und gilt nur bei Verbandsschwellen; die
            ACSM-Skala bei Joggen, Beachvolleyball und Hockey ist bereits für
            Freizeitsportler:innen gedacht.
          </li>
          <li>
            <strong>Bewässerung (−0,5&nbsp;°C):</strong> der schwächste Wert im ganzen
            Modell. Dass Bewässerung die <em>Oberfläche</em> kühlt, ist belegt – sie hält
            aber kaum an: oft schon nach 20–45 Minuten ein deutlicher Rebound, nach
            45–75 Minuten wieder über 50&nbsp;°C. Für
            den WBGT einer Sportfläche existiert keine Studie. Flächige Feldbewässerung
            senkt ihn tagsüber um 0,3–1,3&nbsp;°C, hebt ihn nachts aber um bis zu
            1,3&nbsp;°C an, weil die zusätzliche Feuchte die Feuchtkugel steigen lässt.
            Deshalb rechnet die App höchstens 0,5&nbsp;°C an, nur in der ersten Stunde,
            nur bei Sonne und nur unter 70&nbsp;% Luftfeuchte. Bei schwüler Luft greift
            der Abzug gar nicht.
          </li>
          <li>
            <strong>Beachvolleyball:</strong> Die FIVB schreibt eine WBGT-Messung vor
            jedem Spiel vor, verknüpft damit aber bewusst keine Grenzwerte – begründet mit
            dem eigenen Monitoring: Bahr &amp; Reeser (2012) fanden in 48 Welttour-Events
            genau einen hitzebedingten Rückzug, und der bei einem Spieler mit
            vorangegangener Magen-Darm-Erkrankung. Das waren hitzeakklimatisierte Profis,
            die ihr Tempo selbst steuern – kein Argument für gelockerte Werte im
            Breitensport. Die spätere 11-Jahres-Auswertung fand in 8.530 Spielen 20
            hitzebedingte Auszeiten mit steigendem Risiko bei höherer Temperatur. Unser
            ACSM-Fallback bleibt daher konservativ.
          </li>
          <li>
            <strong>Feldhockey:</strong> Die FIH nutzt gar keinen WBGT, sondern
            <em> Lufttemperatur und Luftfeuchte</em>: Maßnahmen ab 35&nbsp;°C an der
            Auswechselbank, wobei die Schwelle über 65&nbsp;% Feuchte gesenkt werden kann,
            plus eine zweite Stufe ab 75&nbsp;% Feuchte oder 42&nbsp;°C auf dem Feld. Das
            ist eine andere Messgröße und mit unserer Ampel nicht direkt vergleichbar –
            wir zeigen deshalb den ACSM-Fallback.
          </li>
          <li>
            <strong>Joggen:</strong> kein Verbandswert vorhanden, daher die allgemeine
            ACSM-Skala.
          </li>
          <li>
            <strong>Asphalt:</strong> Wärmespeicherung und Rückstrahlung sind gut
            dokumentiert, eine belastbare sportbezogene WBGT-Zahl fehlt. Deshalb nur ein
            Hinweis und ausdrücklich kein erfundener Zuschlag.
          </li>
        </ul>

        <h3 className="mt-1 text-sm font-bold text-slate-800">Grenzen der Wetterdaten</h3>
        <p>
          Die Werte kommen von Open-Meteo und beschreiben ein Modellgitter, keinen Sensor
          am Spielfeldrand. Bis etwa drei Tage im Voraus ist die Prognose belastbar,
          danach zeigt die App bewusst nur einen Trend. Mikroklima – Kessellage, Beton
          ringsum, Tribüne als Windschatten, Baumreihe – steckt nicht in den Daten. Wer
          den Platz kennt, korrigiert über Beschattung und Untergrund nach.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-slate-900">Was daraus folgt</h2>
        <p>
          Die App liefert eine nachvollziehbare Zahl, ihre Herkunft und eine
          Handlungsempfehlung – damit Hitze planbar wird und nicht am heißesten Tag
          spontan verhandelt werden muss. Sie ersetzt keine Messung vor Ort, keine
          medizinische Einschätzung und keine Entscheidung von Spielleitung oder
          Trainerteam. Bei Symptomen wie Schwindel, Übelkeit oder Verwirrtheit gilt
          ohnehin nur eins: sofort abbrechen, kühlen, Hilfe holen.
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
