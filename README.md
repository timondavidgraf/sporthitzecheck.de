# SportHitzeCheck

Hitzerisiko für Sporteinheiten planbar machen: Die App berechnet aus Wetterdaten
den WBGT (Wet Bulb Globe Temperature) für einen konkreten Ort und Zeitraum,
vergleicht ihn mit den Hitzerichtlinien der Sportverbände und gibt eine
Ampel plus Handlungsempfehlung aus.

Kein Account, keine Cookies, keine Tracker-Profile.

## Stack

- Next.js 16 (App Router) und React 19
- TypeScript, Tailwind CSS 4
- Wetterdaten: [Open-Meteo](https://open-meteo.com) (kein API-Key nötig)
- Ortssuche: Google Places/Geocoding über einen serverseitigen Proxy
- Deployment: Vercel, Fehler-Monitoring optional über Sentry

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Danach [http://localhost:3000](http://localhost:3000) öffnen. Ohne
`GOOGLE_MAPS_API_KEY` funktioniert alles außer der Ortssuche per Texteingabe –
die Standortbestimmung per Browser läuft weiter.

Alle Umgebungsvariablen und ihre Bedeutung stehen in `.env.example`.

## Skripte

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktionsbuild |
| `npm run start` | Produktionsserver lokal |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript ohne Emit |

## Aufbau

```
app/                 Routen (Formular, Radar-Dashboard, Rechtstexte)
  api/geocode/       Proxy zur Google-Suche, hält den API-Key serverseitig
lib/
  wbgtCalculator.ts  WBGT-Berechnung und Prognoseaufbereitung
  sportsConfig.ts    Sportarten, Untergründe, Ampelschwellen
  sourcesRegistry.ts Quellen mit Konfidenz und Einschränkung
  recommendations.ts Handlungsempfehlungen je Ampelfarbe
```

## Wissenschaftliche Grundlage

Der WBGT wird nicht gemessen, sondern aus Temperatur, Luftfeuchte, Wind und
Strahlung geschätzt: psychrometrische Feuchtkugel nach Stull (2011), Aufschlag
zur natürlichen Feuchtkugel nach Hunter & Minyard (1999), Windumrechnung von
10 m auf 2 m nach FAO-56.

Jede Zahl in der App ist mit Quelle, Konfidenzstufe und Einschränkung
hinterlegt – nachzulesen unter `/hintergrund` und in `lib/sourcesRegistry.ts`.
Wo keine belastbare Studie existiert, zeigt die App bewusst einen
Warnhinweis statt eines erfundenen Zahlenwerts.

Die App ersetzt keine Messung vor Ort und keine medizinische Einschätzung.
