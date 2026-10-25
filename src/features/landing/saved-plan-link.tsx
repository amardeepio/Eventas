"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePlan } from "@/lib/storage/plan-store";
import { cn } from "@/lib/utils/cn";

export function SavedPlanLink({ className }: { className?: string }) {
  const { plan, hydrated } = usePlan();
  if (!hydrated || !plan) return null;
  return <Link href="/plan" className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-semibold transition hover:border-clay", className)}>
    Open my plan <ArrowUpRight size={15} aria-hidden="true" />
  </Link>;
}
