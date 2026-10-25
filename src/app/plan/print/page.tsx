import type { Metadata } from "next";
import { PrintPlan } from "@/features/print/print-plan";

export const metadata: Metadata = { title: "Export plan" };

export default function PrintPlanPage() {
  return <PrintPlan />;
}
