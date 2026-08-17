import Image from "next/image";
import Link from "next/link";

export function BrandHeader({ asH1 = false }: { asH1?: boolean }) {
  const Title = asH1 ? "h1" : "p";

  return (
    <header className="flex items-center gap-3">
      <Link href="/" className="shrink-0" aria-label="Zur Startseite">
        <Image
          src="/brand/logo.png"
          alt=""
          width={88}
          height={88}
          className="h-[4.5rem] w-auto sm:h-[5.5rem]"
          priority
          unoptimized
        />
      </Link>
      <div>
        <Title className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          SportHitzeCheck
        </Title>
        <p className="text-sm text-gray-500 sm:text-base">
          Hitze-Ampel für den Sport und Vereine
        </p>
      </div>
    </header>
  );
}
