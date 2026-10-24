"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePlan } from "@/lib/storage/plan-store";

export function SavedPlanLink() {
  const { plan, hydrated } = usePlan();
  if (!hydrated || !plan) return null;
  return <Link href="/plan" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-semibold transition hover:border-clay">
    Open my plan <ArrowUpRight size={15} aria-hidden="true" />
  </Link>;
}
