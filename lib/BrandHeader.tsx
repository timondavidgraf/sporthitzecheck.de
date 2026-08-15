import Image from "next/image";
import Link from "next/link";

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  const size = compact ? 72 : 88;

  return (
    <header className="flex items-center gap-3">
      <Link href="/" className="shrink-0" aria-label="Zur Startseite">
        <Image
          src="/brand/logo.png"
          alt=""
          width={size}
          height={size}
          className={compact ? "h-[4.5rem] w-auto" : "h-[5.5rem] w-auto"}
          priority
          unoptimized
        />
      </Link>
      <div>
        {compact ? (
          <p className="text-2xl font-extrabold tracking-tight">SportHitzeCheck</p>
        ) : (
          <h1 className="text-3xl font-extrabold tracking-tight">SportHitzeCheck</h1>
        )}
        <p className={compact ? "text-sm text-gray-500" : "text-base text-gray-500"}>
          Hitze-Ampel für den Sport und Vereine
        </p>
      </div>
    </header>
  );
}
