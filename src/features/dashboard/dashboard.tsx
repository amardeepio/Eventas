"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, CalendarDays, CalendarRange, CircleHelp, Compass, Download, LayoutDashboard, Lightbulb, Menu, Pencil, Plus, Store, Trash2, Undo2, WalletCards, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { usePlan } from "@/lib/storage/plan-store";
import { getPack } from "@/lib/domain/packs";
import { daysUntil, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Overview } from "../overview/overview";
import { BudgetView } from "../budget/budget-view";
import { FunctionsView } from "../functions/functions-view";
import { TimelineView } from "../timeline/timeline-view";
import { VendorsView } from "../vendors/vendors-view";
import { IdeasView } from "../ideas/ideas-view";
import { Assistant } from "../assistant/assistant";
import { GuidedTour, useWarmStudioTour } from "../tour/guided-tour";
import { HelpDialog } from "../tour/help-dialog";
import { ExportDialog } from "../export/export-dialog";
import {
  clearTourProgress,
  clearTourSnooze,
  hasSeenTour,
  markTourSeen,
  resetTours,
  shouldAutoStartTour,
  snoozeTour,
  trackTourEvent,
} from "../tour/tour-storage";

const views = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "functions", label: "Functions", icon: CalendarRange },
  { id: "budget", label: "Budget", icon: WalletCards },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "vendors", label: "Vendors", icon: Store },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
] as const;
type View = (typeof views)[number]["id"];

export function Dashboard() {
  const { plan, hydrated, resetPlan, undo, canUndo } = usePlan();
  const [view, setView] = useState<View>("overview");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const userInteracted = useRef(false);

  // Warm the tour copy for the active language before the first-run tour opens.
  useWarmStudioTour(plan);

  // First visit: offer the tour once, from the overview where every stop lives.
  // Any click or keypress cancels it for this page load so it never ambushes.
  useEffect(() => {
    if (!hydrated || !plan || view !== "overview" || navOpen || assistantOpen || helpOpen || tourOpen || userInteracted.current || !shouldAutoStartTour("studio")) return;
    const timer = window.setTimeout(() => {
      trackTourEvent("studio", "start");
      setTourOpen(true);
    }, 900);
    const cancel = () => {
      userInteracted.current = true;
      window.clearTimeout(timer);
    };
    window.addEventListener("pointerdown", cancel, { once: true, passive: true });
    window.addEventListener("keydown", cancel, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [hydrated, plan, view, navOpen, assistantOpen, helpOpen, tourOpen]);

  const startTour = () => {
    setNavOpen(false);
    setView("overview");
    clearTourSnooze("studio");
    trackTourEvent("studio", hasSeenTour("studio") ? "replay" : "start");
    setTourOpen(true);
  };

  const completeTour = () => {
    markTourSeen("studio");
    trackTourEvent("studio", "complete", "finish");
    setTourOpen(false);
  };

  const skipTour = () => {
    snoozeTour("studio");
    clearTourProgress("studio");
    trackTourEvent("studio", "skip");
    setTourOpen(false);
  };

  const dismissTour = () => {
    markTourSeen("studio");
    trackTourEvent("studio", "dismiss");
    setTourOpen(false);
  };

  const openAssistantFromTour = () => {
    markTourSeen("studio");
    trackTourEvent("studio", "complete", "finish");
    setTourOpen(false);
    setAssistantOpen(true);
  };

  const resetTourHints = () => {
    resetTours();
    trackTourEvent("studio", "reset");
  };

  if (!hydrated) return <DashboardSkeleton />;
  if (!plan) return <main id="main-content" className="grid min-h-dvh place-items-center px-6"><div className="max-w-md text-center"><Logo className="mb-10" /><h1 className="font-display text-5xl font-medium">Your next gathering starts here.</h1><p className="mt-5 leading-7 text-muted">Create a short brief and we’ll turn it into a budget, timeline, vendor checklist, and ideas.</p><Link href="/new" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-clay px-7 text-sm font-semibold text-white">Create a plan <Plus size={17} /></Link></div></main>;

  const pack = getPack(plan.brief.eventType);
  const days = daysUntil(plan.brief.date);
  const titles: Record<View, string> = { overview: "Your planning studio", functions: "The shape of the celebration", budget: "A budget that adds up", timeline: "The path to the day", vendors: "Your vendor little black book", ideas: "Ideas with your name on them" };
  const visibleViews = views.filter((item) => item.id !== "functions" || plan.brief.eventType === "wedding");
  const nav = (mobile = false) => <nav aria-label="Plan sections" data-tour={mobile ? "nav-mobile" : "nav-desktop"} className={cn("flex flex-col gap-1", mobile && "menu-stagger")}>{visibleViews.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setNavOpen(false); }} aria-current={view === id ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition", view === id ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-soft hover:text-ink")}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{label}{id === "timeline" && <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{plan.timeline.filter((task) => task.status !== "done").length}</span>}</button>)}</nav>;

  return <div className="min-h-dvh">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-y-auto border-r border-line/80 bg-paper/70 p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-xl scrollbar-thin lg:flex">
      <Logo className="mb-8 px-2" />
      <div className="mb-6 rounded-2xl bg-ink p-4 text-white" data-tour="plan-summary"><p className="text-[9px] font-bold tracking-[.17em] text-white/50 uppercase">{pack.label} plan</p><p className="mt-2 truncate font-display text-xl">{plan.brief.title}</p><p className="mt-1 text-[11px] text-white/55">{formatDate(plan.brief.date, { month: "long", day: "numeric", timeZone: "UTC" })} · {plan.brief.guests} guests</p></div>
      {nav()}
      <div className="mt-auto space-y-2 pt-6" data-tour="sidebar-actions"><LanguageSwitcher label="Language" className="w-full justify-between" /><Button data-testid="open-assistant" data-tour="assistant-desktop" className="w-full" onClick={() => setAssistantOpen(true)}><Bot size={17} aria-hidden="true" /> Ask Eventas</Button><button onClick={undo} disabled={!canUndo} className="flex min-h-10 w-full items-center justify-center gap-2 text-xs font-medium text-muted transition hover:text-ink disabled:opacity-40"><Undo2 size={13} aria-hidden="true" /> Undo last change</button><Link href="/new?edit=1" className="flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-muted hover:text-ink"><Pencil size={13} /> Edit brief</Link><button onClick={startTour} className="flex min-h-10 w-full items-center justify-center gap-2 text-xs font-medium text-muted hover:text-ink"><Compass size={13} aria-hidden="true" /> Take the tour</button><Link href="/new" onClick={(event) => { if (!window.confirm("Start a new plan? Your current plan will be replaced. Export it first if you want to keep a copy.")) event.preventDefault(); }} className="flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-muted hover:text-ink"><Plus size={13} /> New event plan</Link><button onClick={() => { if (window.confirm("Delete this locally saved plan and start over?")) resetPlan(); }} className="flex min-h-10 w-full items-center justify-center gap-2 text-xs font-medium text-muted hover:text-red-700"><Trash2 size={13} aria-hidden="true" /> Delete plan</button></div>
    </aside>

    <div className="lg:pl-[248px]">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bone/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl" data-tour="plan-header">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <Dialog.Root open={navOpen} onOpenChange={(next) => { setNavOpen(next); if (next && "vibrate" in navigator) navigator.vibrate(8); }}><Dialog.Trigger asChild><Button variant="ghost" size="icon" className="lg:hidden" data-tour="menu-trigger" aria-label="Open navigation"><Menu size={20} /></Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out lg:hidden" /><Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[290px] overflow-y-auto bg-paper p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out scrollbar-thin lg:hidden"><div className="mb-8 flex items-center justify-between"><Dialog.Title className="sr-only">Plan navigation</Dialog.Title><Logo /><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close navigation"><X size={19} /></Button></Dialog.Close></div>{nav(true)}<div className="mt-4 space-y-1 border-t border-line pt-4"><Link href="/new?edit=1" onClick={() => setNavOpen(false)} className="flex min-h-11 items-center gap-2 rounded-2xl px-4 text-xs font-medium text-muted hover:bg-soft hover:text-ink"><Pencil size={13} aria-hidden="true" /> Edit brief</Link><button onClick={() => { undo(); setNavOpen(false); }} disabled={!canUndo} className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-4 text-xs font-medium text-muted hover:bg-soft hover:text-ink disabled:opacity-40"><Undo2 size={13} aria-hidden="true" /> Undo last change</button><button onClick={() => { setNavOpen(false); window.setTimeout(startTour, 240); }} className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-4 text-xs font-medium text-muted hover:bg-soft hover:text-ink"><Compass size={14} aria-hidden="true" /> Take the tour</button><Link href="/new" onClick={(event) => { if (!window.confirm("Start a new plan? Your current plan will be replaced. Export it first if you want to keep a copy.")) event.preventDefault(); else setNavOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-2xl px-4 text-xs font-medium text-muted hover:bg-soft hover:text-ink"><Plus size={13} aria-hidden="true" /> New event plan</Link><button onClick={() => { if (window.confirm("Delete this locally saved plan and start over?")) { resetPlan(); setNavOpen(false); } }} className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-4 text-xs font-medium text-muted hover:bg-soft hover:text-red-700"><Trash2 size={13} aria-hidden="true" /> Delete plan</button></div><div className="mt-4 border-t border-line pt-4"><LanguageSwitcher label="Language" className="w-full justify-between" /></div></Dialog.Content></Dialog.Portal></Dialog.Root>
          <div className="min-w-0 flex-1"><h1 className="truncate font-display text-xl font-medium sm:text-2xl"><span className="sm:hidden">{visibleViews.find((item) => item.id === view)?.label}</span><span className="hidden sm:inline">{titles[view]}</span></h1></div>
          <Badge className="hidden border-sage/20 bg-[#e8ede6] text-sage sm:inline-flex"><span className="size-1.5 rounded-full bg-sage" />{days > 0 ? `${days} days to go` : "Event day"}</Badge>
          <Link href="/new?edit=1" className="hidden min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted hover:bg-soft hover:text-ink md:inline-flex"><Pencil size={14} aria-hidden="true" /> Edit brief</Link>
          <LanguageSwitcher label="Language" className="hidden shrink-0 md:inline-flex lg:hidden" />
          <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Undo last change" title="Undo last change" className="hidden sm:inline-flex"><Undo2 size={18} aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} aria-label="Help and tours" title="Help and tours"><CircleHelp size={18} aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setExportOpen(true)} data-tour="export" aria-label="Export plan" title="Export plan"><Download size={18} /></Button>
          <Button data-testid="open-assistant-mobile" data-tour="assistant-mobile" size="sm" className="lg:hidden" onClick={() => setAssistantOpen(true)} aria-label="Ask Eventas"><Bot size={17} /></Button>
        </div>
        <nav aria-label="Plan sections" data-tour="nav-mobile" className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">{visibleViews.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition active:scale-[.97]", view === id ? "bg-ink text-white" : "text-muted")}><Icon size={14} />{label}</button>)}</nav>
      </header>

      <main id="main-content" className="mx-auto max-w-[1400px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10" key={view}>
        <div className="animate-rise">
          {view === "overview" && <Overview onNavigate={(target) => setView(target)} onOpenAssistant={() => setAssistantOpen(true)} />}
          {view === "functions" && <FunctionsView />}
          {view === "budget" && <BudgetView />}
          {view === "timeline" && <TimelineView />}
          {view === "vendors" && <VendorsView />}
          {view === "ideas" && <IdeasView />}
        </div>
        <footer className="mt-12 flex flex-col gap-2 border-t border-line pt-5 text-[11px] text-muted sm:flex-row sm:justify-between"><p>Eventas estimates support planning; they are not vendor quotes.</p><button className="min-h-8 text-left underline decoration-line underline-offset-4 hover:text-ink" onClick={() => { if (window.confirm("Delete this locally saved plan and start over?")) resetPlan(); }}>Delete plan & start over</button></footer>
      </main>
    </div>
    <Assistant open={assistantOpen} onOpenChange={setAssistantOpen} />
    <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} onStartTour={startTour} onResetTours={resetTourHints} onOpenAssistant={() => setAssistantOpen(true)} />
    <ExportDialog plan={plan} open={exportOpen} onOpenChange={setExportOpen} />
    {tourOpen && <GuidedTour view={view} onViewChange={setView} onClose={skipTour} onFinish={completeTour} onDismiss={dismissTour} onOpenAssistant={openAssistantFromTour} />}
  </div>;
}

function DashboardSkeleton() {
  return <main id="main-content" className="mx-auto max-w-6xl animate-pulse px-6 py-12" aria-label="Loading your plan"><div className="h-8 w-56 rounded-full bg-soft" /><div className="mt-10 grid gap-5 md:grid-cols-3"><div className="h-52 rounded-3xl bg-soft md:col-span-2" /><div className="h-52 rounded-3xl bg-soft" /><div className="h-72 rounded-3xl bg-soft md:col-span-3" /></div></main>;
}
