import type { Metadata } from "next";
import { PrintRunSheet } from "@/features/print/print-run-sheet";

export const metadata: Metadata = { title: "Run sheet" };

export default function PrintRunSheetPage() {
  return <PrintRunSheet />;
}
