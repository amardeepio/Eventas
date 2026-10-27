"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Bot, CalendarDays, Check, Compass, Heart, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-provider";
import { cn } from "@/lib/utils/cn";
import { TourShell, type TourStep } from "./tour-shell";
import {
  clearTourProgress,
  clearTourSnooze,
  getTourProgress,
  hasSeenTour,
  markTourSeen,
  setTourProgress,
  shouldAutoStartTour,
  snoozeTour,
  trackTourEvent,
} from "./tour-storage";

interface LandingTourContextValue {
  start: () => void;
}

const LandingTourContext = createContext<LandingTourContextValue | null>(null);

export function useLandingTour() {
  const context = useContext(LandingTourContext);
  if (!context) throw new Error("useLandingTour must be used inside LandingTourProvider");
  return context;
}

/**
 * A short, product-level tour for first-time visitors. It introduces the
 * promise, the three event types, the workflow, privacy, and the guide before
 * anyone has to create a plan.
 */
export function LandingTourProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const initialStepId = useState(() => getTourProgress("landing") ?? undefined)[0];

  useEffect(() => {
    if (!shouldAutoStartTour("landing")) return;
    const timer = window.setTimeout(() => {
      trackTourEvent("landing", "start");
      setOpen(true);
    }, 1600);
    // Do not ambush someone who is already reading, scrolling, or chatting.
    const cancel = () => window.clearTimeout(timer);
    window.addEventListener("pointerdown", cancel, { once: true, passive: true });
    window.addEventListener("keydown", cancel, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, []);

  const start = useCallback(() => {
    clearTourSnooze("landing");
    trackTourEvent("landing", hasSeenTour("landing") ? "replay" : "start");
    setOpen(true);
  }, []);

  const finish = useCallback(() => {
    markTourSeen("landing");
    trackTourEvent("landing", "complete", "finish");
    setOpen(false);
  }, []);

  const skip = useCallback(() => {
    snoozeTour("landing");
    clearTourProgress("landing");
    trackTourEvent("landing", "skip");
    setOpen(false);
  }, []);

  const dismiss = useCallback(() => {
    markTourSeen("landing");
    trackTourEvent("landing", "dismiss");
    setOpen(false);
  }, []);

  const steps = useMemo<TourStep[]>(() => [
    {
      id: "welcome",
      icon: Compass,
      eyebrow: t("Welcome"),
      title: t("A short tour of Eventas"),
      body: t("A few stops to show you how a 60-second brief becomes a budget, timeline, vendor plan, and ideas. Skip at any time."),
    },
    {
      id: "hero",
      icon: Sparkles,
      eyebrow: t("The promise"),
      title: t("One brief. The whole plan."),
      body: t("Tell us the date, guests, budget, place, and what matters most. No account, no endless questionnaire."),
      targets: ["[data-tour=landing-hero]"],
    },
    {
      id: "preview",
      icon: LayoutDashboard,
      eyebrow: t("The result"),
      title: t("A plan you can see"),
      body: t("A budget that reconciles to the rupee, a realistic countdown, a vendor checklist with the right questions, and ideas that feel like you."),
      targets: ["[data-tour=landing-preview]"],
    },
    {
      id: "types",
      icon: Heart,
      eyebrow: t("Every kind of together"),
      title: t("Three kinds of gatherings"),
      body: t("Weddings, birthdays, and community events share one calm planning engine — with the details each one actually needs."),
      targets: ["[data-tour=landing-types]"],
    },
    {
      id: "how",
      icon: CalendarDays,
      eyebrow: t("A calmer way to plan"),
      title: t("From “where do we start?” to “we’ve got this.”"),
      body: t("Smart defaults do the organizing. You make the decisions that matter, and the plan stays in step with your date."),
      targets: ["[data-tour=landing-how]"],
    },
    {
      id: "trust",
      icon: ShieldCheck,
      eyebrow: t("Built on good judgment"),
      title: t("AI for imagination. Logic for the numbers."),
      body: t("The planning engine owns every rupee and date. AI adds personal ideas and conversation. Your plan stays in this browser."),
      targets: ["[data-tour=landing-trust]"],
    },
    {
      id: "assistant",
      icon: Bot,
      eyebrow: t("Ask anything"),
      title: t("A guide before you commit"),
      body: t("Ask about budgeting, the three event types, AI use, or exactly how your data is stored — before creating a plan."),
      targets: ["[data-tour=landing-assistant]"],
    },
    {
      id: "finish",
      icon: Check,
      eyebrow: t("Ready when you are"),
      title: t("Your moment starts with a brief"),
      body: t("Prefer to look first? Open a sample wedding, or start with your own date and guest count."),
    },
  ], [t]);

  return <LandingTourContext.Provider value={{ start }}>
    {children}
    {open && <TourShell
      steps={steps}
      initialStepId={initialStepId}
      onClose={skip}
      onFinish={finish}
      onDismiss={dismiss}
      onProgress={(stepId) => { setTourProgress("landing", stepId); trackTourEvent("landing", "step", stepId); }}
      finishHref="/new"
      finishLabel={t("Plan my event")}
      finishSummary={[t("Start with a 60-second brief"), t("Or open the sample wedding"), t("Ask the guide before you commit")]}
      testId="landing-tour"
    />}
  </LandingTourContext.Provider>;
}

export function LandingTourTrigger({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { start } = useLandingTour();
  return <button
    onClick={start}
    className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-soft hover:text-ink", className)}
  >
    <Compass size={15} aria-hidden="true" />
    {t("Tour")}
  </button>;
}
