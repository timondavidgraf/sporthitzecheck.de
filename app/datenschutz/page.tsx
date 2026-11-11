import type { Metadata } from "next";
import { LegalShell } from "@/lib/LegalShell";
import { CONTACT_EMAIL, LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Datenschutzerklärung zu SportHitzeCheck, Google Places, Besucherzählung ohne Cookies, Sentry und E-Mail-Kontakt.",
  alternates: { canonical: "/datenschutz" },
  openGraph: {
    title: "Datenschutz – SportHitzeCheck",
    url: "/datenschutz",
  },
};

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <p>
        Diese Erklärung informiert über die Verarbeitung personenbezogener Daten
        beim Besuch von SportHitzeCheck gemäß der Datenschutz-Grundverordnung
        (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).
      </p>

      <section>
        <h2 className="text-base font-bold text-slate-900">1. Verantwortliche Stelle</h2>
        <p className="mt-1.5 whitespace-pre-line">
          {LEGAL_OPERATOR.name}
          {"\n"}
          {LEGAL_OPERATOR.addition}
          {"\n"}
          {LEGAL_OPERATOR.street}
          {"\n"}
          {LEGAL_OPERATOR.zipCity}
        </p>
        <p>
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
          2. Keine Nutzerkonten, keine Cookies
        </h2>
        <p className="mt-1.5">
          SportHitzeCheck erfordert keine Registrierung. Es werden keine Profile
          angelegt. Angaben zu Sportart, Zeitpunkt und Standort fließen in die
          Ergebnis-URL ein und können zusätzlich im lokalen Speicher des Browsers
          (localStorage) liegen. Diese Daten verbleiben auf dem jeweiligen Gerät
          und werden von uns nicht in einem Nutzerkonto gespeichert.
        </p>
        <p>
          Die Anwendung setzt <strong>keine Cookies</strong> und bindet keine
          Werbe- oder Tracking-Netzwerke ein. Im localStorage werden zwei Dinge
          abgelegt: die letzte Formulareingabe, damit sie beim nächsten Aufruf
          nicht erneut getippt werden muss, und die abgerufenen Wetterdaten für
          maximal 60 Minuten, um wiederholte Abfragen zu vermeiden. Beides dient
          unmittelbar der angeforderten Funktion und ist damit nach § 25 Abs. 2
          Nr. 2 TDDDG ohne Einwilligung zulässig. Es findet keine
          geräteübergreifende Wiedererkennung statt. Sie können diese Daten
          jederzeit über die Browsereinstellungen löschen.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">3. Hosting</h2>
        <p className="mt-1.5">
          Die Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
          91723, USA, betrieben. Beim Aufruf werden technisch notwendige
          Server-Logdaten verarbeitet (z. B. IP-Adresse, Zeitpunkt, aufgerufene
          Seite). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Betrieb und
          Sicherheit des Angebots). Vercel kann Daten in den USA verarbeiten;
          Vercel stützt die Übermittlung auf Standardvertragsklauseln.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">
          4. Standortsuche über Google Maps / Places API
        </h2>
        <p className="mt-1.5">
          Wenn ein Vereinsname oder eine Adresse gesucht wird, sendet unser Server
          die Suchanfrage an die Google Maps Platform (Places Text Search, bei
          Bedarf Geocoding) der Google Ireland Limited, Gordon House, Barrow
          Street, Dublin 4, Irland, bzw. verbundener Unternehmen von Google LLC,
          USA. Dabei können Suchbegriff, ungefähre IP-Adresse und technische
          Anfragedaten an Google übermittelt werden. Google kann diese Daten in
          den USA verarbeiten.
        </p>
        <p>
          Zweck ist die Umwandlung einer Ortsangabe in Koordinaten für die
          Wetterabfrage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (funktionsfähige Standortsuche) bzw. – soweit erforderlich – Art. 6 Abs.
          1 lit. a DSGVO. Die Übermittlung in ein Drittland stützt sich auf die
          Standardvertragsklauseln der EU-Kommission im Rahmen der Google Maps
          Platform. Weitere Hinweise:{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-700 underline decoration-orange-200 underline-offset-2"
          >
            Datenschutzerklärung von Google
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">
          5. Standortbestimmung über den Browser
        </h2>
        <p className="mt-1.5">
          Wenn Sie „Aktuellen Standort nutzen“ wählen, fragt Ihr Browser Sie um
          Erlaubnis und übergibt die Koordinaten anschließend an diese Seite.
          Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO in
          Verbindung mit § 25 Abs. 1 TDDDG; Sie können die Erlaubnis jederzeit in den
          Browsereinstellungen widerrufen. Die Koordinaten werden nicht an Google
          übermittelt, sondern ausschließlich für die Wetterabfrage genutzt. Ohne
          Einwilligung bleibt die Suche per Vereinsname oder Adresse nutzbar.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">6. Wetterdaten (Open-Meteo)</h2>
        <p className="mt-1.5">
          Für die WBGT-Näherung werden Koordinaten an die API von Open-Meteo
          übermittelt. Open-Meteo erhält den Standort als geographische Koordinate
          sowie den Zeitraum der Abfrage, nicht den eingegebenen Vereinsnamen.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">
          7. Besucherzählung ohne Cookies
        </h2>
        <p className="mt-1.5">
          Um zu verstehen, wie viele Menschen das Angebot nutzen und wie sie es
          finden, zählt unser Server die Seitenabrufe selbst – ohne Cookies, ohne
          Skript in Ihrem Browser und ohne dass auf Ihrem Gerät etwas gespeichert
          oder ausgelesen wird. Ausgewertet wird nur, was Ihr Browser beim Abruf
          einer Seite ohnehin mitsendet: aufgerufene Seite, verweisende Website
          (nur deren Domain) bzw. Kampagnenangaben im Link, Browserkennung,
          bevorzugte Sprache und IP-Adresse. Diese Angaben übermittelt unser
          Server bei jedem Seitenabruf an einen eigenen Zählserver des Betreibers.
          Dort wird aus IP-Adresse (bei IPv6 nur der Netzanteil), Browserkennung,
          unserer Domain und einem täglich neu erzeugten Zufallswert eine
          Tageskennung berechnet, damit Besucher eines Tages nicht doppelt zählen;
          gespeichert werden ausschließlich Tagessummen (z. B. Seitenaufrufe,
          Besuche, Herkunft, grober Gerätetyp, Browser- und Betriebssystemfamilie,
          Sprache). IP-Adresse und Browserkennung werden nicht gespeichert, der
          Zufallswert wird um Mitternacht verworfen; danach ist kein Bezug zu
          einer Person mehr möglich. Sendet Ihr Browser „Do Not Track“ oder
          „Global Privacy Control“, wird nicht gezählt; Sie können auch formlos
          per E-Mail widersprechen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f
          DSGVO (Reichweitenmessung in datensparsamem Umfang). Die Tagessummen
          bewahren wir bis zu 800 Tage auf.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">
          8. Fehlermeldungen über Sentry (anonymisierte Logs)
        </h2>
        <p className="mt-1.5">
          Zur Stabilität der Anwendung setzen wir Sentry (Functional Software,
          Inc., USA) ein. Übermittelt werden technische Fehlerinformationen
          (z. B. Fehlertyp, betroffene Code-Stelle, Browser-Typ). Die
          Konfiguration ist auf Datenschutz ausgelegt:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            sendDefaultPii: false
          </code>
          . IP-Adressen, Cookies und andere Identifikatoren werden nicht
          mitgesendet bzw. vor dem Versand entfernt. Auch der Query-Teil der
          aufgerufenen Adresse wird entfernt, damit Koordinaten der
          Ergebnisseite nicht in Fehlermeldungen landen. Sentry ist nur aktiv,
          wenn eine DSN-Umgebungsvariable gesetzt ist. Die Meldungen laufen über
          einen Pfad unserer eigenen Domain (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/monitoring</code>),
          Ihr Browser baut also keine direkte Verbindung zu Sentry auf.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Fehlerbehebung). Eine
          Übermittlung in die USA kann im Rahmen der Auftragsverarbeitung
          erfolgen und stützt sich auf Standardvertragsklauseln.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">9. Kartenausschnitt</h2>
        <p className="mt-1.5">
          Die Standortvorschau bindet eine Karte von OpenStreetMap ein. Beim Laden
          des Kartenausschnitts kann der Kartenanbieter die IP-Adresse und den
          angefragten Kartenbereich verarbeiten. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. f DSGVO.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">
          10. Kontaktaufnahme per E-Mail und E-Mail-Weiterleitung
        </h2>
        <p className="mt-1.5">
          Wenn Sie uns per E-Mail kontaktieren, werden Ihre Angaben inklusive der
          von Ihnen angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und
          für den Fall von Anschlussfragen bei uns verarbeitet (Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO).
        </p>
        <p>
          Für den Empfang und die Weiterleitung eingehender E-Mails an unsere
          Domain nutzen wir den Open-Source-Dienst{" "}
          <a
            href="https://forwardemail.net/en/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-700 underline decoration-orange-200 underline-offset-2"
          >
            Forward Email
          </a>{" "}
          (Forward Email LLC, USA). Die Verarbeitung erfolgt temporär im
          Arbeitsspeicher (In-Memory) ohne dauerhafte Protokollierung oder
          Speicherung der E-Mail-Inhalte auf den Weiterleitungsservern. Mit dem
          Anbieter besteht eine Vereinbarung zur Auftragsverarbeitung (Data
          Processing Agreement, DPA) auf Grundlage der EU-Standardvertragsklauseln
          (SCC). Die eigentliche Speicherung und Bearbeitung Ihrer E-Mail erfolgt
          anschließend in unserem Postfach bei{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-700 underline decoration-orange-200 underline-offset-2"
          >
            Google
          </a>{" "}
          (Gmail / Google LLC, USA), zertifiziert unter dem EU-U.S. Data Privacy
          Framework.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">11. Speicherdauer</h2>
        <p className="mt-1.5">
          Server-Logs werden vom Hoster üblicherweise kurzfristig vorgehalten.
          Die Tagessummen der Besucherzählung bewahren wir bis zu 800 Tage auf
          (siehe Abschnitt 7). Fehlerdaten werden nur so lange gespeichert, wie es
          für den jeweiligen Zweck erforderlich ist. Daten im localStorage können Sie
          selbst im Browser löschen.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">12. Ihre Rechte</h2>
        <p className="mt-1.5">
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
          der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen
          Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Soweit eine
          Einwilligung Grundlage ist, können Sie diese mit Wirkung für die Zukunft
          widerrufen. Außerdem besteht ein Beschwerderecht bei einer
          Datenschutzaufsichtsbehörde. Für uns zuständig ist der{" "}
          <a
            href="https://www.baden-wuerttemberg.datenschutz.de"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-700 underline decoration-orange-200 underline-offset-2"
          >
            Landesbeauftragte für den Datenschutz und die Informationsfreiheit
            Baden-Württemberg
          </a>
          ; Sie können sich aber auch an die Behörde Ihres Wohnorts wenden.
        </p>
        <p>
          Kontakt für Datenschutzanfragen:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-orange-700 underline decoration-orange-200 underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
