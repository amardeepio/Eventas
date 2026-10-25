"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, CalendarDays, CalendarRange, Download, LayoutDashboard, Lightbulb, Menu, Pencil, Plus, Store, WalletCards, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { usePlan } from "@/lib/storage/plan-store";
import { getPack } from "@/lib/domain/packs";
import { daysUntil, formatDate } from "@/lib/utils/format";
import { downloadPlan } from "@/lib/utils/export-plan";
import { cn } from "@/lib/utils/cn";
import { Overview } from "../overview/overview";
import { BudgetView } from "../budget/budget-view";
import { FunctionsView } from "../functions/functions-view";
import { TimelineView } from "../timeline/timeline-view";
import { VendorsView } from "../vendors/vendors-view";
import { IdeasView } from "../ideas/ideas-view";
import { Assistant } from "../assistant/assistant";

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
  const { plan, hydrated, resetPlan } = usePlan();
  const [view, setView] = useState<View>("overview");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  if (!hydrated) return <DashboardSkeleton />;
  if (!plan) return <main id="main-content" className="grid min-h-screen place-items-center px-6"><div className="max-w-md text-center"><Logo className="mb-10" /><h1 className="font-display text-5xl font-medium">Your next gathering starts here.</h1><p className="mt-5 leading-7 text-muted">Create a short brief and we’ll turn it into a budget, timeline, vendor checklist, and ideas.</p><Link href="/new" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-clay px-7 text-sm font-semibold text-white">Create a plan <Plus size={17} /></Link></div></main>;

  const pack = getPack(plan.brief.eventType);
  const days = daysUntil(plan.brief.date);
  const titles: Record<View, string> = { overview: "Your planning studio", functions: "The shape of the celebration", budget: "A budget that adds up", timeline: "The path to the day", vendors: "Your vendor little black book", ideas: "Ideas with your name on them" };
  const visibleViews = views.filter((item) => item.id !== "functions" || plan.brief.eventType === "wedding");
  const nav = (mobile = false) => <nav aria-label="Plan sections" className={cn("flex gap-1", mobile ? "flex-col" : "flex-col")}>{visibleViews.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setNavOpen(false); }} aria-current={view === id ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition", view === id ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-soft hover:text-ink")}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{label}{id === "timeline" && <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{plan.timeline.filter((task) => task.status !== "done").length}</span>}</button>)}</nav>;

  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line/80 bg-paper/70 p-5 backdrop-blur-xl lg:flex">
      <Logo className="mb-8 px-2" />
      <div className="mb-6 rounded-2xl bg-ink p-4 text-white"><p className="text-[9px] font-bold tracking-[.17em] text-white/50 uppercase">{pack.label} plan</p><p className="mt-2 truncate font-display text-xl">{plan.brief.title}</p><p className="mt-1 text-[11px] text-white/55">{formatDate(plan.brief.date, { month: "long", day: "numeric", timeZone: "UTC" })} · {plan.brief.guests} guests</p></div>
      {nav()}
      <div className="mt-auto space-y-2 pt-6"><Button data-testid="open-assistant" className="w-full" onClick={() => setAssistantOpen(true)}><Bot size={17} aria-hidden="true" /> Ask Eventas</Button><Link href="/new?edit=1" className="flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-muted hover:text-ink"><Pencil size={13} /> Edit brief</Link><Link href="/new" onClick={(event) => { if (!window.confirm("Start a new plan? Your current plan will be replaced. Export it first if you want to keep a copy.")) event.preventDefault(); }} className="flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-muted hover:text-ink"><Plus size={13} /> New event plan</Link></div>
    </aside>

    <div className="lg:pl-[248px]">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bone/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <Dialog.Root open={navOpen} onOpenChange={setNavOpen}><Dialog.Trigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu size={20} /></Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm lg:hidden" /><Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[290px] bg-paper p-5 shadow-2xl outline-none lg:hidden"><div className="mb-8 flex items-center justify-between"><Dialog.Title className="sr-only">Plan navigation</Dialog.Title><Logo /><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close navigation"><X size={19} /></Button></Dialog.Close></div>{nav(true)}<div className="mt-6"><LanguageSwitcher label="Language" className="w-full justify-between" /></div></Dialog.Content></Dialog.Portal></Dialog.Root>
          <div className="min-w-0 flex-1"><h1 className="truncate font-display text-xl font-medium sm:text-2xl"><span className="sm:hidden">{visibleViews.find((item) => item.id === view)?.label}</span><span className="hidden sm:inline">{titles[view]}</span></h1></div>
          <Badge className="hidden border-sage/20 bg-[#e8ede6] text-sage sm:inline-flex"><span className="size-1.5 rounded-full bg-sage" />{days > 0 ? `${days} days to go` : "Event day"}</Badge>
          <Link href="/new?edit=1" className="hidden min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted hover:bg-soft hover:text-ink md:inline-flex"><Pencil size={14} aria-hidden="true" /> Edit brief</Link>
          <LanguageSwitcher label="Language" className="hidden shrink-0 md:inline-flex" />
          <Button variant="ghost" size="icon" onClick={() => downloadPlan(plan)} aria-label="Export plan as Markdown" title="Export plan"><Download size={18} /></Button>
          <Button size="sm" className="lg:hidden" onClick={() => setAssistantOpen(true)} aria-label="Ask Eventas"><Bot size={17} /></Button>
        </div>
        <nav aria-label="Plan sections" className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">{visibleViews.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold", view === id ? "bg-ink text-white" : "text-muted")}><Icon size={14} />{label}</button>)}</nav>
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
  </div>;
}

function DashboardSkeleton() {
  return <main id="main-content" className="mx-auto max-w-6xl animate-pulse px-6 py-12" aria-label="Loading your plan"><div className="h-8 w-56 rounded-full bg-soft" /><div className="mt-10 grid gap-5 md:grid-cols-3"><div className="h-52 rounded-3xl bg-soft md:col-span-2" /><div className="h-52 rounded-3xl bg-soft" /><div className="h-72 rounded-3xl bg-soft md:col-span-3" /></div></main>;
}
