"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

/** Kleinere Werte = näher herangezoomt. */
const ZOOM_PADS = [0.0025, 0.00125, 0.000625, 0.0003125, 0.00015625] as const;
const DEFAULT_ZOOM = 2;

function touchDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function OsmMap({ lat, lng }: { lat: number; lng: number }) {
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const touchLayerRef = useRef<HTMLDivElement>(null);

  const pad = ZOOM_PADS[zoom];
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const largerHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=20/${lat}/${lng}`;
  const coordLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  useEffect(() => {
    const layer = touchLayerRef.current;
    if (!layer) return;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchRef.current = {
          startDist: touchDistance(event.touches[0], event.touches[1]),
          startZoom: zoomRef.current,
        };
      }
    };

    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const distance = touchDistance(event.touches[0], event.touches[1]);
      const steps = Math.round(Math.log2(distance / pinchRef.current.startDist));
      const next = Math.min(
        ZOOM_PADS.length - 1,
        Math.max(0, pinchRef.current.startZoom + steps),
      );
      setZoom(next);
    };

    const onEnd = () => {
      pinchRef.current = null;
    };

    layer.addEventListener("touchstart", onStart, { passive: true });
    layer.addEventListener("touchmove", onMove, { passive: false });
    layer.addEventListener("touchend", onEnd);
    layer.addEventListener("touchcancel", onEnd);
    return () => {
      layer.removeEventListener("touchstart", onStart);
      layer.removeEventListener("touchmove", onMove);
      layer.removeEventListener("touchend", onEnd);
      layer.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (failed) {
    return (
      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        Karte nicht verfügbar. Koordinaten: {coordLabel}
      </p>
    );
  }

  return (
    <div className="mt-2">
      <div className="relative overflow-hidden rounded-lg border border-gray-200">
        <iframe
          title="Standortkarte"
          src={embedSrc}
          className="pointer-events-none h-40 w-full border-0 md:pointer-events-auto"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setFailed(true)}
        />
        <div
          ref={touchLayerRef}
          className="absolute inset-0 touch-pan-y md:hidden"
          aria-hidden
        />
        <div className="absolute right-2 bottom-2 z-10 flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white/95 shadow-sm">
          <button
            type="button"
            aria-label="Hineinzoomen"
            disabled={zoom >= ZOOM_PADS.length - 1}
            onClick={() => setZoom((value) => Math.min(ZOOM_PADS.length - 1, value + 1))}
            className="flex size-8 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-35"
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Herauszoomen"
            disabled={zoom <= 0}
            onClick={() => setZoom((value) => Math.max(0, value - 1))}
            className="flex size-8 items-center justify-center border-t border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-35"
          >
            <Minus className="size-4" aria-hidden />
          </button>
        </div>
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
