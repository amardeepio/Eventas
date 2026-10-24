import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = { title: "Your planning studio" };

export default function PlanPage() {
  return <Dashboard />;
}
