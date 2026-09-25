# Offene Punkte

Festgehalten am 25.09.2026 nach dem Code-Review. Nichts davon ist umgesetzt.

## 1. Ortssuche und Karte (Google-Nutzungsbedingungen)

**Problem:** Die Ortssuche nutzt Google (Places Text Search, Fallback Geocoding),
die Karte ist aber ein OpenStreetMap-Embed. Soweit bekannt, verbieten die
Google-Maps-Platform-Bedingungen, Google-Inhalte zusammen mit einer fremden
Karte zu verwenden. Außerdem:

- Die genutzte **Places API (Legacy)** ist für neue Projekte gesperrt und ein
  Auslaufmodell; mittelfristig auf *Places API (New)* umstellen.
- Koordinaten aus Google-Ergebnissen dürfen nach den Bedingungen höchstens
  **30 Tage** zwischengespeichert werden. Das Formular hält sie im localStorage
  (`sporthitzecheck_form`) unbegrenzt.
- Ohne Google-Karte verlangt Google den Hinweis **„Powered by Google“** bei den
  Suchergebnissen.

**Entscheidung (25.09.2026):** Bei Google bleiben. Geplante Lösung, wenn es
angegangen wird:

1. OSM-Embed (`lib/OsmMap.tsx`) durch die **Maps Embed API** ersetzen
   (kostenlos, ohne Mengenbegrenzung).
2. **Zwei-Klick-Karte:** Platzhalter „Karte von Google Maps laden“, iframe erst
   nach Klick – vorher fließen keine Daten an Google (Einwilligung, TTDSG/DSGVO).
3. **Eigener Schlüssel** `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` (landet sichtbar im
   Browser): in der Cloud Console nur für die Maps Embed API freigeben und auf
   `sporthitzecheck.de/*` und `localhost:3000/*` beschränken. Den Server-Schlüssel
   `GOOGLE_MAPS_API_KEY` nie dafür verwenden. Auch in Vercel eintragen.
4. `next.config.ts`: CSP `frame-src` von `https://www.openstreetmap.org` auf
   `https://www.google.com` umstellen.
5. Datenschutzerklärung: OSM-Abschnitt durch Google Maps ersetzen, Einwilligung
   per Klick beschreiben.
6. Gespeicherte Such-Koordinaten nach 30 Tagen verwerfen (Standort per GPS ist
   nicht betroffen).

Offene Grauzone: Aus den Google-Koordinaten wird auch Open-Meteo abgefragt
(Nutzung ohne Karte). Vermutlich vertretbar, weil das Ergebnis auf einer
Google-Karte gezeigt wird – nicht rechtlich geprüft.

**Verworfene Alternative Geoapify** (deutscher Anbieter, EU-Server, OSM-Daten,
3.000 Anfragen/Tag frei): Test mit 12 typischen Suchen am 25.09.2026. Adressen,
Stadien und bekannte Anlagen gut; kleine Vereinsnamen schlecht („SV Baiersbronn
Sportplatz“ → Sportplatz in Bühl, „TSV Schönaich“ → falsche Orte,
„Leichtathletikstadion Tübingen“ → Berlin). Grund: In OpenStreetMap tragen
Sportplätze oft keinen Vereinsnamen.

**Auffällig:** Der lokale `GOOGLE_MAPS_API_KEY` beantwortet alle Anfragen mit
`REQUEST_DENIED` (vermutlich Website-/IP-Beschränkung oder Legacy-API nicht
aktiviert). Prüfen, ob die Suche live funktioniert.

## 2. Rate-Limit für `/api/geocode`

Das Limit im Code (`app/api/geocode/route.ts`) liegt im Arbeitsspeicher und gilt
auf Vercel nur pro Instanz; die Origin-Prüfung lässt sich mit gefälschten
Headern umgehen. Wirksamer Schutz gegen Google-Kosten ist eine Firewall-Regel
(Hobby-Plan: eine Rate-Limit-Regel kostenlos), nur im Dashboard einrichtbar:

- Projekt → **Firewall** → **Configure** → **+ New Rule**
- Bedingung: *Request Path* beginnt mit `/api/geocode`
- Aktion: **Rate Limit**, Fixed Window, 60 s, 30 Anfragen, Schlüssel **IP**
- **Review Changes** → **Publish** (kein neues Deployment nötig)

Zusätzlich ein Budget-Alarm im Google-Billing-Konto.
