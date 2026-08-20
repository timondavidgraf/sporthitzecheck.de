"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const COMPACT_MQ = "(max-width: 639px)";

export function useIsCompactScreen() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_MQ);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return compact;
}

export function TipPopover({
  open,
  onClose,
  children,
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const compact = useIsCompactScreen();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !compact) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, compact, onClose]);

  if (!open) return null;

  if (compact && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-end justify-center p-3">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/40"
          aria-label="Hinweis schließen"
          onClick={onClose}
        />
        <div
          role="dialog"
          className="relative z-10 mb-[max(0.5rem,env(safe-area-inset-bottom))] max-h-[min(75vh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-slate-900 p-4 text-left text-[13px] leading-relaxed font-medium text-white shadow-xl"
        >
          <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/25" aria-hidden />
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <span
      role="tooltip"
      className={`absolute top-full z-30 mt-1 w-80 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg bg-slate-900 p-2.5 text-left text-[11px] leading-relaxed font-medium text-white shadow-lg ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      {children}
    </span>
  );
}

export function Tip({
  label,
  children,
  align = "right",
  className = "",
  buttonClassName = "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-slate-600",
  iconClassName = "size-3.5",
  iconStrokeWidth,
}: {
  label: string;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  iconStrokeWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const compact = useIsCompactScreen();
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      onBlur={
        compact
          ? undefined
          : (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                onClose();
              }
            }
      }
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={buttonClassName}
      >
        <Info className={iconClassName} strokeWidth={iconStrokeWidth} aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
      <TipPopover open={open} onClose={onClose} align={align}>
        {children}
      </TipPopover>
    </span>
  );
}
