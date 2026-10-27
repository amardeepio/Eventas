"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarPlus, Check, FileSpreadsheet, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import { downloadBudgetCsv, downloadCalendar, downloadPlan, downloadTimelineCsv } from "@/lib/utils/export-plan";
import type { Plan } from "@/lib/domain/types";

interface ExportDialogProps {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportKind = "calendar" | "budget" | "timeline";

const items: { kind: ExportKind; icon: typeof CalendarPlus; title: string; detail: string }[] = [
  { kind: "calendar", icon: CalendarPlus, title: "Calendar (.ics)", detail: "Functions, muhurat, and open milestones for Google Calendar, Apple Calendar, or Outlook." },
  { kind: "budget", icon: FileSpreadsheet, title: "Budget spreadsheet (.csv)", detail: "Every category with suggested, planned, and actual amounts." },
  { kind: "timeline", icon: FileSpreadsheet, title: "Timeline spreadsheet (.csv)", detail: "Every task with its phase, due date, owner status, priority, and function." },
];

export function ExportDialog({ plan, open, onOpenChange }: ExportDialogProps) {
  const { t } = useLanguage();
  const [done, setDone] = useState<ExportKind | null>(null);

  function runExport(kind: ExportKind) {
    if (kind === "calendar") downloadCalendar(plan);
    else if (kind === "budget") downloadBudgetCsv(plan);
    else downloadTimelineCsv(plan);
    setDone(kind);
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-md -translate-y-1/2 overflow-y-auto rounded-[28px] border border-line bg-paper p-6 shadow-[0_30px_80px_rgba(30,24,18,.28)] outline-none scrollbar-thin data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="font-display text-2xl font-medium">{t("Export plan")}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted">{t("Print it, add it to your calendar, or take the numbers into a spreadsheet.")}</Dialog.Description>
          </div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={t("Close export")}><X size={18} /></Button></Dialog.Close>
        </div>

        <div className="mt-6 space-y-2">
          <button onClick={() => { downloadPlan(); onOpenChange(false); }} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-bone/50 p-4 text-left transition hover:border-clay/40 hover:bg-blush/40">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush text-clay"><Printer size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("Print / Save as PDF")}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{t("A print-ready document with every function, budget line, task, vendor question, and saved idea.")}</span></span>
          </button>
          {items.map(({ kind, icon: Icon, title, detail }) => <button key={kind} onClick={() => runExport(kind)} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-bone/50 p-4 text-left transition hover:border-clay/40 hover:bg-blush/40">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush text-clay"><Icon size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(title)}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{t(detail)}</span></span>
            {done === kind && <Check size={16} className="shrink-0 text-sage" aria-hidden="true" />}
          </button>)}
        </div>

        <p role="status" aria-live="polite" className="mt-4 text-[11px] font-medium text-sage">{done ? t("Downloaded. Check your downloads, then open it in your calendar or spreadsheet app.") : ""}</p>
        <p className="mt-3 text-[11px] leading-5 text-muted">{t("Everything is generated from the plan in this browser. Estimates are not vendor quotes.")}</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
