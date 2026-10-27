"use client";

import { useMemo, useState } from "react";
import { Bot, CalendarDays, CalendarRange, Check, Compass, Download, LayoutDashboard, Lightbulb, ListChecks, Menu, Sparkles, Store, WalletCards } from "lucide-react";
import { usePlan } from "@/lib/storage/plan-store";
import { useLanguage } from "@/lib/i18n/language-provider";
import { getPack } from "@/lib/domain/packs";
import { getNextTasks } from "@/lib/domain/engine/plan";
import type { Plan } from "@/lib/domain/types";
import { TourShell, type TourStep } from "./tour-shell";
import { getTourProgress, setTourProgress, trackTourEvent } from "./tour-storage";

type Translate = (source: string, vars?: Record<string, string | number>) => string;

export type StudioView = "overview" | "functions" | "budget" | "timeline" | "guests" | "run-sheet" | "vendors" | "ideas";

/** Warm the translation cache before the first-run tour opens. */
export function useWarmStudioTour(plan: Plan | null) {
  const { t } = useLanguage();
  return useMemo(() => plan ? createStudioSteps(plan, t) : [], [plan, t]);
}

/**
 * The studio tour is content, not code: one list that adapts to the event pack.
 * Wedding hosts get the functions/muhurat stop; everyone gets five shared views.
 */
export function createStudioSteps(plan: Plan, t: Translate): TourStep[] {
  const pack = getPack(plan.brief.eventType);
  const sections = [
    { id: "overview", label: t("Overview") },
    ...(plan.brief.eventType === "wedding" ? [{ id: "functions", label: t("Functions") }] : []),
    { id: "budget", label: t("Budget") },
    { id: "timeline", label: t("Timeline") },
    { id: "vendors", label: t("Vendors") },
    { id: "ideas", label: t("Ideas") },
  ];
  const sectionNames = sections.map((section) => section.label).join(", ");
  const eventType = plan.brief.eventType;
  const vendorsBody = eventType === "wedding"
    ? t("Track the pandit, caterer, decorator, photographer, mehndi artist, dhol team, and hotel from idea to booked. Collect quotes and draft a plan-aware enquiry with the right questions.")
    : eventType === "birthday"
      ? t("Track the baker, entertainer, caterer, and photographer from idea to booked. Collect quotes and draft a plan-aware enquiry with the right questions.")
      : t("Track the AV crew, safety lead, food vendors, and security from idea to booked. Keep permits and volunteer owners visible, and draft the questions to ask.");
  const ideasBody = eventType === "wedding"
    ? t("Reception florals, mehndi details, welcome gifts, and a playlist — shaped by your vibe, budget, and priorities. Save the ones that feel like you.")
    : eventType === "birthday"
      ? t("Cake, playlist, favors, and a standout theme — shaped by the guest of honor, budget, and priorities. Save the ones that feel right.")
      : t("Programming, outreach, AV, and small welcoming touches — shaped by the neighborhood, budget, and priorities. Save the ones that fit.");
  const timelineBody = eventType === "wedding"
    ? t("Mehndi, sangeet, ceremony, and reception deadlines stay anchored to each function. Filter, add your own, and tick them off as you go.")
    : eventType === "birthday"
      ? t("A three-month runway, ordered around the party date. Filter, add your own, and tick them off as you go.")
      : t("A six-month runway covering permits, outreach, volunteers, and the run of show. Filter, add your own, and tick them off as you go.");

  return [
    {
      id: "welcome",
      icon: Compass,
      eyebrow: t("Welcome"),
      title: t("A quick tour of your studio"),
      body: t("You’re planning a {type}. Here is where the brief, budget, timeline, vendors, and ideas live. Skip at any time — you can replay this tour from the menu.", { type: pack.label.toLowerCase() }),
    },
    {
      id: "brief",
      icon: Sparkles,
      eyebrow: t("Your brief"),
      title: t("Your whole event, one line"),
      body: t("Your title, date, guests, and countdown stay pinned in the studio. From here you can download the plan, switch language, or ask for help without losing your work."),
      targets: ["[data-tour=plan-summary]", "[data-tour=plan-header]"],
      view: "overview",
    },
    {
      id: "navigation",
      icon: LayoutDashboard,
      eyebrow: t("Find your way"),
      title: t("{count} calm views", { count: sections.length }),
      body: t("Everything lives in one menu: {sections}. Each answers one question, so you never have to hunt for a number.", { sections: sectionNames }),
      targets: ["[data-tour=nav-desktop]", "[data-tour=nav-mobile]"],
      view: "overview",
    },
    {
      id: "overview",
      icon: CalendarDays,
      eyebrow: t("The big picture"),
      title: t("The day at a glance"),
      body: t("This is your event’s heartbeat: days to go, who is coming, where it is, and what needs attention next."),
      targets: ["[data-tour=overview-hero]"],
      view: "overview",
    },
    {
      id: "next-moves",
      icon: ListChecks,
      eyebrow: t("Keep moving"),
      title: t("Your next three moves"),
      body: t("The engine turns your date into ordered milestones. Tick one off right here — the countdown updates everywhere, and you can reopen it from the Timeline."),
      targets: ["[data-tour=next-moves]"],
      view: "overview",
      action: { label: t("Tick my first milestone") },
    },
    ...(plan.brief.eventType === "wedding" ? [{
      id: "functions",
      icon: CalendarRange,
      eyebrow: t("The celebration"),
      title: t("Function by function"),
      body: t("Mehndi, sangeet, ceremony, reception — each has its own date, guests, and budget target. Add a muhurat window and the timeline anchors to it."),
      targets: ["[data-tour=functions-hero]"],
      view: "functions",
    } satisfies TourStep] : []),
    {
      id: "budget",
      icon: WalletCards,
      eyebrow: t("The money"),
      title: t("A budget that adds up"),
      body: t("Every rupee has a category and reconciles to your total. Edit planned amounts as quotes arrive, enter actual spend, and use Rebalance with AI for a safe trade-off."),
      targets: ["[data-tour=budget-working]"],
      view: "budget",
    },
    {
      id: "timeline",
      icon: CalendarDays,
      eyebrow: t("The path"),
      title: t("The path to the day"),
      body: timelineBody,
      targets: ["[data-tour=timeline-hero]"],
      view: "timeline",
    },
    {
      id: "vendors",
      icon: Store,
      eyebrow: t("The vendor team"),
      title: t("Your vendor little black book"),
      body: vendorsBody,
      targets: ["[data-tour=vendors-hero]"],
      view: "vendors",
      action: { label: t("Mark a vendor as contacted") },
    },
    {
      id: "ideas",
      icon: Lightbulb,
      eyebrow: t("Your ideas"),
      title: t("Ideas with your name on them"),
      body: ideasBody,
      targets: ["[data-tour=ideas-hero]"],
      view: "ideas",
    },
    {
      id: "assistant",
      icon: Bot,
      eyebrow: t("Ask anything"),
      title: t("A copilot that knows the plan"),
      body: t("Ask where you are overspending, what you forgot, or how to rebalance safely. It reads your real brief, budget, and checklist."),
      targets: ["[data-tour=assistant-desktop]", "[data-tour=assistant-mobile]"],
    },
    {
      id: "actions",
      icon: Menu,
      eyebrow: t("Make it yours"),
      title: t("Everything else, one tap away"),
      body: t("Edit the brief, switch language, undo the last change, replay this tour, start a new plan, or delete this one — it’s all here. Everything saves automatically on this device."),
      targets: ["[data-tour=sidebar-actions]", "[data-tour=menu-trigger]"],
    },
    {
      id: "export",
      icon: Download,
      eyebrow: t("Take it with you"),
      title: t("A plan you can share"),
      body: t("Download a print-ready PDF, add functions and open milestones to your calendar (.ics), or take the budget and timeline into a spreadsheet. Everything stays local."),
      targets: ["[data-tour=export]"],
    },
    {
      id: "finish",
      icon: Check,
      eyebrow: t("All set"),
      title: t("Now make it yours"),
      body: t("Start with the next three moves, or ask Eventas anything. Replay this tour any time from the sidebar or menu."),
      view: "overview",
    },
  ];
}

interface GuidedTourProps {
  onClose: () => void;
  onFinish: () => void;
  onDismiss: () => void;
  view: StudioView;
  onViewChange: (view: StudioView) => void;
  onOpenAssistant: () => void;
}

export function GuidedTour({ onClose, onFinish, onDismiss, view, onViewChange, onOpenAssistant }: GuidedTourProps) {
  const { plan, updatePlan } = usePlan();
  const { t } = useLanguage();
  const steps = useMemo(() => plan ? createStudioSteps(plan, t) : [], [plan, t]);
  const initialStepId = useState(() => getTourProgress("studio") ?? undefined)[0];
  if (!plan || steps.length === 0) return null;
  const activePlan = plan;
  const nextMoves = getNextTasks(activePlan).slice(0, 3).map((task) => task.title);

  function runAction(stepId: string) {
    if (stepId === "next-moves") {
      const task = getNextTasks(activePlan)[0];
      if (!task) return t("You’re already all caught up here.");
      updatePlan((current) => ({ ...current, timeline: current.timeline.map((item) => item.id === task.id ? { ...item, status: "done" } : item) }));
      return t("“{task}” is done. One less thing on your plate.", { task: task.title });
    }
    if (stepId === "vendors") {
      const vendor = activePlan.vendors.find((item) => item.status === "idea" || item.status === "shortlisted");
      if (!vendor) return t("Every vendor is already moving. Nice work.");
      updatePlan((current) => ({ ...current, vendors: current.vendors.map((item) => item.id === vendor.id ? { ...item, status: "contacted" } : item) }));
      return t("{vendor} is marked as contacted. Next stop: a quote.", { vendor: vendor.category });
    }
    return "";
  }

  return <TourShell
    steps={steps}
    initialStepId={initialStepId}
    onClose={onClose}
    onFinish={onFinish}
    onDismiss={onDismiss}
    onProgress={(stepId) => { setTourProgress("studio", stepId); trackTourEvent("studio", "step", stepId); }}
    activeView={view}
    onViewChange={(next) => onViewChange(next as StudioView)}
    onAction={runAction}
    finishLabel={t("Start planning")}
    finishSummary={nextMoves.length > 0 ? nextMoves : undefined}
    finishAction={{ label: t("Ask my first question"), onRun: onOpenAssistant }}
    testId="guided-tour"
  />;
}
