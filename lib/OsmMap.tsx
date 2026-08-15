"use client";

import { useState } from "react";

/** Zwei Zoomstufen näher als 0,0025° – bbox jeweils halbiert. */
const OSM_PAD = 0.000625;

export function OsmMap({ lat, lng }: { lat: number; lng: number }) {
  const [failed, setFailed] = useState(false);
  const bbox = `${lng - OSM_PAD},${lat - OSM_PAD},${lng + OSM_PAD},${lat + OSM_PAD}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const largerHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=20/${lat}/${lng}`;
  const coordLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  if (failed) {
    return (
      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        Karte nicht verfügbar. Koordinaten: {coordLabel}
      </p>
    );
  }

  return (
    <div className="mt-2">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <iframe
          title="Standortkarte"
          src={embedSrc}
          className="h-40 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setFailed(true)}
        />
      </div>
      <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
        <a
          href={largerHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-orange-600 hover:decoration-orange-400"
        >
          Größere Karte
        </a>
        <span>{coordLabel}</span>
      </p>
    </div>
  );
}
