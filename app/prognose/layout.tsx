import type { Metadata } from "next";

/**
 * Die Ergebnisseite lebt von Query-Parametern (Ort, Sportart, Zeitraum) und hat
 * ohne sie keinen eigenen Inhalt. Sie gehört deshalb nicht in den Index –
 * sonst konkurrieren beliebig viele Parameter-Varianten mit der Startseite.
 */
export const metadata: Metadata = {
  title: "Prognose",
  robots: { index: false, follow: false },
};

export default function PrognoseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
