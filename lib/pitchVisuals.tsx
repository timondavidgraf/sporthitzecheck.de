import Image from "next/image";
import { CloudSun, Sun, Trees } from "lucide-react";
import type { Shadow, Surface } from "@/lib/wbgtCalculator";
import { ALL_SURFACE_OPTIONS } from "@/lib/formOptions";

/**
 * Gemeinsame Optik für Untergrund und Beschattung.
 * Formular und Ergebnisseite müssen dieselben Fotos/Icons nutzen.
 */
export const SHADOW_VISUAL: Record<
  Shadow,
  { icon: typeof Sun; tile: string; iconClass: string }
> = {
  none: { icon: Sun, tile: "bg-amber-100", iconClass: "text-amber-600" },
  partial: { icon: CloudSun, tile: "bg-sky-100", iconClass: "text-sky-700" },
  full: { icon: Trees, tile: "bg-emerald-100", iconClass: "text-emerald-700" },
};

const BOX = { form: "size-11", tag: "size-8" } as const;
const ICON = { form: "size-6", tag: "size-4" } as const;
/** Kantenlänge in Pixeln, passend zu BOX – next/image braucht feste Maße. */
const PX = { form: 44, tag: 32 } as const;

type ThumbSize = keyof typeof BOX;

export function SurfaceThumb({
  surface,
  size = "form",
}: {
  surface: Surface;
  size?: ThumbSize;
}) {
  const option = ALL_SURFACE_OPTIONS.find((o) => o.value === surface);
  const box = BOX[size];

  if (option?.image) {
    return (
      <Image
        src={option.image}
        alt=""
        width={PX[size]}
        height={PX[size]}
        className={`${box} shrink-0 rounded-md object-cover ring-1 ring-black/10`}
      />
    );
  }

  return (
    <span
      className={`${box} shrink-0 rounded-md ring-1 ring-black/10 ${
        option?.swatch ?? "bg-slate-300"
      }`}
      aria-hidden
    />
  );
}

export function ShadowThumb({
  shadow,
  size = "form",
}: {
  shadow: Shadow;
  size?: ThumbSize;
}) {
  const visual = SHADOW_VISUAL[shadow];
  const Icon = visual.icon;

  return (
    <span
      className={`flex ${BOX[size]} shrink-0 items-center justify-center rounded-md ring-1 ring-black/10 ${visual.tile}`}
      aria-hidden
    >
      <Icon className={`${ICON[size]} ${visual.iconClass}`} />
    </span>
  );
}
