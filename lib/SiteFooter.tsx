import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-md px-4 py-6 lg:max-w-6xl">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <Link href="/hintergrund" className="underline-offset-2 hover:text-gray-700 hover:underline">
          Hintergrund
        </Link>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <Link href="/impressum" className="underline-offset-2 hover:text-gray-700 hover:underline">
          Impressum
        </Link>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <Link href="/datenschutz" className="underline-offset-2 hover:text-gray-700 hover:underline">
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
