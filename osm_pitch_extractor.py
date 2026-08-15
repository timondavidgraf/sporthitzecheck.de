"""
SportHitzeCheck – Datenqualitaets-Check fuer OpenStreetMap.

Fragt die Overpass API nach Fussballplaetzen (leisure=pitch + sport=soccer) und
Sportanlagen (leisure=sports_centre) in Freiburg im Breisgau und im Landkreis
Emmendingen ab.

Die Leitfrage: Koennen wir Plaetze automatisch importieren und Vereinen
zuordnen? Dafuer zaehlt vor allem, wie oft das Tag `surface` fehlt – ohne
Untergrund koennen wir den WBGT-Offset nicht bestimmen.

Aufruf:  python osm_pitch_extractor.py
"""

import json
import math
import sys
import time
from collections import Counter

import requests

# Overpass ist ein freier Dienst und antwortet regelmaessig mit 429 oder 504,
# wenn er ausgelastet ist. Deshalb mehrere Server und ein paar Versuche.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
ATTEMPTS_PER_URL = 2
RETRY_WAIT_S = 5

OUTPUT_FILE = "test_pitches.json"

# Admin-Level 6 = Landkreis bzw. kreisfreie Stadt (Freiburg ist ein Stadtkreis).
QUERY = """
[out:json][timeout:90];
(
  area["name"="Freiburg im Breisgau"]["admin_level"="6"];
  area["name"="Landkreis Emmendingen"]["admin_level"="6"];
)->.searchArea;
(
  nwr["leisure"="pitch"]["sport"="soccer"](area.searchArea);
  nwr["leisure"="sports_centre"](area.searchArea);
);
out center tags;
"""

# Ab welcher Entfernung ein Platz nicht mehr zu einer Sportanlage gezaehlt wird.
SPORTS_CENTRE_RADIUS_M = 200


def fetch_overpass() -> dict:
    """
    Schickt die Query an Overpass und gibt die geparste JSON-Antwort zurueck.

    Probiert der Reihe nach alle Server, jeweils mehrfach. Erst wenn keiner
    antwortet, fliegt der letzte Fehler nach oben.
    """
    last_error: Exception | None = None

    for url in OVERPASS_URLS:
        for attempt in range(1, ATTEMPTS_PER_URL + 1):
            try:
                response = requests.post(
                    url,
                    data={"data": QUERY},
                    headers={"User-Agent": "SportHitzeCheck-DataCheck/1.0"},
                    timeout=120,
                )
                response.raise_for_status()
                return response.json()
            except requests.RequestException as error:
                last_error = error
                print(f"  {url} -> {error.__class__.__name__} (Versuch {attempt})")
                time.sleep(RETRY_WAIT_S)

    raise last_error if last_error else RuntimeError("Keine Overpass-Antwort")


def get_coordinates(element: dict) -> tuple[float, float] | tuple[None, None]:
    """
    Mittelpunkt des Elements.

    Nodes haben lat/lon direkt, Ways und Relations bekommen durch `out center`
    ein `center`-Objekt.
    """
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]

    center = element.get("center")
    if center:
        return center.get("lat"), center.get("lon")

    return None, None


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Grobe Entfernung in Metern (flache Erde – auf wenigen km voellig ausreichend)."""
    mean_lat = math.radians((lat1 + lat2) / 2)
    dx = (lon2 - lon1) * 111_320 * math.cos(mean_lat)
    dy = (lat2 - lat1) * 110_540
    return math.hypot(dx, dy)


def extract(element: dict) -> dict:
    """Reduziert ein OSM-Element auf die Felder, die uns interessieren."""
    tags = element.get("tags", {})
    lat, lon = get_coordinates(element)

    return {
        "osm_type": element.get("type"),
        "osm_id": element.get("id"),
        "category": "sports_centre" if tags.get("leisure") == "sports_centre" else "pitch",
        # Vereinsname steht mal in `name`, bei Anlagen manchmal nur im Operator
        "name": tags.get("name"),
        "operator": tags.get("operator"),
        "lat": lat,
        "lng": lon,
        "surface": tags.get("surface"),
        "lit": tags.get("lit"),
    }


def count_linked_pitches(pitches: list[dict], centres: list[dict]) -> int:
    """
    Wie viele Plaetze liegen im Umkreis einer Sportanlage?

    Naeherung ueber die Mittelpunkte – eine echte Pruefung braeuchte die
    Polygon-Geometrie. Reicht aber, um die Frage zu beantworten, ob Plaetze
    ueberhaupt organisatorisch eingebettet sind.
    """
    located_centres = [c for c in centres if c["lat"] is not None]
    linked = 0

    for pitch in pitches:
        if pitch["lat"] is None:
            continue
        if any(
            distance_m(pitch["lat"], pitch["lng"], c["lat"], c["lng"])
            <= SPORTS_CENTRE_RADIUS_M
            for c in located_centres
        ):
            linked += 1

    return linked


def percent(part: int, total: int) -> str:
    return f"{part / total * 100:5.1f} %" if total else "    - "


def print_statistics(pitches: list[dict], centres: list[dict]) -> None:
    total = len(pitches)

    with_surface = [p for p in pitches if p["surface"]]
    without_surface = total - len(with_surface)
    with_name = sum(1 for p in pitches if p["name"])

    print()
    print("=" * 62)
    print("  OSM-Datenqualitaet: Freiburg i. Br. + Landkreis Emmendingen")
    print("=" * 62)
    print(f"  Fussballplaetze gefunden      : {total:4d}")
    print(f"  davon mit `surface`-Tag       : {len(with_surface):4d}  ({percent(len(with_surface), total)})")
    print(f"  davon OHNE `surface`-Tag      : {without_surface:4d}  ({percent(without_surface, total)})")
    print(f"  davon mit `name`-Tag          : {with_name:4d}  ({percent(with_name, total)})")
    print("-" * 62)

    if with_surface:
        print("  Verteilung der Untergruende:")
        for value, count in Counter(p["surface"] for p in with_surface).most_common():
            print(f"    {value:<20} {count:4d}  ({percent(count, total)})")
        print("-" * 62)

    linked = count_linked_pitches(pitches, centres)
    print(f"  Sportanlagen (sports_centre)  : {len(centres):4d}")
    print(f"  Plaetze im Umkreis einer Anlage: {linked:4d}  ({percent(linked, total)})")
    print(f"  (Naeherung: Mittelpunkt-Abstand <= {SPORTS_CENTRE_RADIUS_M} m)")
    print("=" * 62)
    print(f"  Daten gespeichert in: {OUTPUT_FILE}")
    print()


def main() -> int:
    print("Frage Overpass API ab ... (kann 10-60 Sekunden dauern)", flush=True)

    try:
        data = fetch_overpass()
    except requests.RequestException as error:
        print(f"Abfrage fehlgeschlagen: {error}", file=sys.stderr)
        return 1

    elements = [extract(e) for e in data.get("elements", [])]
    pitches = [e for e in elements if e["category"] == "pitch"]
    centres = [e for e in elements if e["category"] == "sports_centre"]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as handle:
        json.dump(
            {"pitches": pitches, "sports_centres": centres},
            handle,
            ensure_ascii=False,
            indent=2,
        )

    print_statistics(pitches, centres)
    return 0


if __name__ == "__main__":
    sys.exit(main())
