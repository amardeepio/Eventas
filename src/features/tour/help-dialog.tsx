"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Bot, Compass, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTour: () => void;
  onResetTours: () => void;
  onOpenAssistant: () => void;
}

export function HelpDialog({ open, onOpenChange, onStartTour, onResetTours, onOpenAssistant }: HelpDialogProps) {
  const { t } = useLanguage();
  const [resetDone, setResetDone] = useState(false);

  function start() {
    onOpenChange(false);
    window.setTimeout(onStartTour, 220);
  }

  function ask() {
    onOpenChange(false);
    window.setTimeout(onOpenAssistant, 220);
  }

  function reset() {
    onResetTours();
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 3200);
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-md -translate-y-1/2 overflow-y-auto rounded-[28px] border border-line bg-paper p-6 shadow-[0_30px_80px_rgba(30,24,18,.28)] outline-none scrollbar-thin data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="font-display text-2xl font-medium">{t("Help & tours")}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-muted">{t("New here, or want the tour again? Everything is local to this device.")}</Dialog.Description>
          </div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={t("Close help")}><X size={18} /></Button></Dialog.Close>
        </div>

        <div className="mt-6 space-y-2">
          <button onClick={start} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-bone/50 p-4 text-left transition hover:border-clay/40 hover:bg-blush/40">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush text-clay"><Compass size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("Take the studio tour")}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{t("A guided walk through the brief, budget, timeline, vendors, and ideas.")}</span></span>
            <ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
          <button onClick={ask} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-bone/50 p-4 text-left transition hover:border-clay/40 hover:bg-blush/40">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush text-clay"><Bot size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("Ask Eventas")}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{t("Questions about the plan, budget, vendors, or what to do next.")}</span></span>
            <ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button onClick={reset} className="flex min-h-9 items-center gap-2 rounded-full text-xs font-semibold text-muted transition hover:text-ink"><RotateCcw size={13} aria-hidden="true" />{t("Reset tour hints")}</button>
          <span role="status" aria-live="polite" className="text-[11px] font-medium text-sage">{resetDone ? t("Tour hints reset.") : ""}</span>
        </div>

        <p className="mt-4 text-[11px] leading-5 text-muted">{t("Your plan and tour state stay in this browser. No account, no server copy.")}</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
