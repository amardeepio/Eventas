"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarPlus, Check, Download, FileSpreadsheet, Printer, ShieldCheck, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import { usePlan } from "@/lib/storage/plan-store";
import { downloadBudgetCsv, downloadCalendar, downloadPlan, downloadRunSheetCsv, downloadTimelineCsv } from "@/lib/utils/export-plan";
import { downloadBackup, parseBackupText } from "@/lib/utils/backup";
import type { PlanBackup } from "@/lib/validation/schemas";
import type { Plan } from "@/lib/domain/types";

interface ExportDialogProps {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportKind = "calendar" | "budget" | "timeline" | "run-sheet" | "backup";

const items: { kind: ExportKind; icon: typeof CalendarPlus; title: string; detail: string }[] = [
  { kind: "calendar", icon: CalendarPlus, title: "Calendar (.ics)", detail: "Functions, muhurat, and open milestones with reminders for Google Calendar, Apple Calendar, or Outlook." },
  { kind: "budget", icon: FileSpreadsheet, title: "Budget spreadsheet (.csv)", detail: "Every category with suggested, planned, and actual amounts." },
  { kind: "timeline", icon: FileSpreadsheet, title: "Timeline spreadsheet (.csv)", detail: "Every task with its phase, due date, owner status, priority, and function." },
  { kind: "run-sheet", icon: FileSpreadsheet, title: "Run sheet (.csv)", detail: "Every day-of row with its function, time, owner, location, contact, and notes." },
  { kind: "backup", icon: ShieldCheck, title: "Full backup (.json)", detail: "Every saved plan, guest, vendor, task, and custom line in one file. Keep it somewhere safe." },
];

export function ExportDialog({ plan, open, onOpenChange }: ExportDialogProps) {
  const { t } = useLanguage();
  const { createBackup, importBackup } = usePlan();
  const [done, setDone] = useState<ExportKind | null>(null);
  const [preview, setPreview] = useState<PlanBackup | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function runExport(kind: ExportKind) {
    if (kind === "calendar") downloadCalendar(plan);
    else if (kind === "budget") downloadBudgetCsv(plan);
    else if (kind === "timeline") downloadTimelineCsv(plan);
    else if (kind === "run-sheet") downloadRunSheetCsv(plan);
    else downloadBackup(createBackup());
    setDone(kind);
  }

  async function chooseBackup(file: File | undefined) {
    setImportError("");
    setPreview(null);
    if (!file) return;
    try {
      setPreview(parseBackupText(await file.text()));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not read that backup.");
    }
  }

  function restore(mode: "merge" | "replace") {
    if (!preview) return;
    importBackup(preview, mode);
    setPreview(null);
    setDone("backup");
    onOpenChange(false);
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

        <div className="mt-6 rounded-2xl border border-line bg-bone/40 p-4">
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-sage"><Upload size={16} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{t("Restore a backup")}</h3><p className="mt-1 text-xs leading-5 text-muted">{t("Import a previous .eventas.json file. Merge keeps plans already on this device; replace starts from the file.")}</p></div></div>
          <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Choose backup file" className="sr-only" onChange={(event) => void chooseBackup(event.target.files?.[0])} />
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}><Download size={14} /> {t("Choose backup file")}</Button>
          {importError && <p role="alert" className="mt-3 text-xs font-medium text-red-700">{importError}</p>}
          {preview && <div className="mt-3 rounded-xl border border-sage/25 bg-[#e8ede6]/60 p-3"><p className="text-xs font-semibold">{preview.workspace.plans.length} plan{preview.workspace.plans.length === 1 ? "" : "s"} found</p><p className="mt-1 text-[11px] leading-5 text-muted">{preview.workspace.plans.slice(0, 3).map((item) => item.brief.title).join(" · ")}{preview.workspace.plans.length > 3 ? " …" : ""}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => restore("merge")}>{t("Merge into this device")}</Button><Button size="sm" variant="ghost" onClick={() => restore("replace")}>{t("Replace everything")}</Button></div></div>}
        </div>

        <p role="status" aria-live="polite" className="mt-4 text-[11px] font-medium text-sage">{done ? (done === "backup" ? t("Backup ready. Store it somewhere you can find it.") : t("Downloaded. Check your downloads, then open it in your calendar or spreadsheet app.")) : ""}</p>
        <p className="mt-3 text-[11px] leading-5 text-muted">{t("Everything is generated from the plan in this browser. Estimates are not vendor quotes. Backups contain guest details and the RSVP host key, so treat the file as private.")}</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
