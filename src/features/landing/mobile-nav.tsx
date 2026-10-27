"use client";

import { useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Compass, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Logo } from "@/components/ui/logo";
import { useLanguage } from "@/lib/i18n/language-provider";
import { useLandingTour } from "@/features/tour/landing-tour";

/**
 * Phone-sized landing navigation. The header keeps only the brand, the primary
 * call to action, and this trigger visible; secondary links live in the sheet.
 */
export function LandingMobileNav({ savedPlan }: { savedPlan: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const { start: startTour } = useLandingTour();
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && "vibrate" in navigator) navigator.vibrate(8);
  };
  return <Dialog.Root open={open} onOpenChange={handleOpenChange}>
    <Dialog.Trigger asChild>
      <Button variant="ghost" size="icon" className="size-11 min-h-11 shrink-0 sm:hidden" aria-label="Open menu">
        <Menu size={20} aria-hidden="true" />
      </Button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out sm:hidden" />
      <Dialog.Content
        className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,340px)] flex-col bg-paper pt-[calc(1.25rem+env(safe-area-inset-top))] pr-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pl-5 shadow-2xl outline-none data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out sm:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <Dialog.Title className="sr-only">Eventas menu</Dialog.Title>
          <Logo />
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon" className="size-11 min-h-11" aria-label="Close menu">
              <X size={19} aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </div>
        <nav aria-label="Mobile navigation" className="menu-stagger mt-8 space-y-2">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-2xl px-4 text-sm font-semibold text-ink transition hover:bg-soft">How it works</a>
          <button onClick={() => { setOpen(false); window.setTimeout(startTour, 240); }} className="flex min-h-12 w-full items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-ink transition hover:bg-soft"><Compass size={15} aria-hidden="true" />{t("Tour")}</button>
          <div onClick={() => setOpen(false)}>{savedPlan}</div>
          <Link href="/new" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between rounded-2xl bg-ink px-4 text-sm font-semibold text-white transition hover:bg-clay-dark">
            Start planning <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </nav>
        <div className="mt-auto border-t border-line pt-5">
          <LanguageSwitcher label="Language" className="w-full justify-between" />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
