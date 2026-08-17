import { BrandHeader } from "@/lib/BrandHeader";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 lg:max-w-3xl">
      <div className="mb-6">
        <BrandHeader />
      </div>
      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-slate-700">
          {children}
        </div>
      </article>
    </main>
  );
}
