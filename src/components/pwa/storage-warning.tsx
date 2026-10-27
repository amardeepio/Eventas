"use client";

import { AlertTriangle } from "lucide-react";
import { usePlan } from "@/lib/storage/plan-store";

export function StorageWarning() {
  const { storageError } = usePlan();
  if (!storageError) return null;
  return <div role="alert" className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[95] mx-auto flex max-w-2xl items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800 shadow-lg">
    <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
    <span>{storageError}</span>
  </div>;
}
