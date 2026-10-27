"use client";

import { ArrowRight, BellRing, Bot, CalendarDays, CalendarRange, Circle, Clock3, Lightbulb, Sparkles, Store, Users } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { usePlan } from "@/lib/storage/plan-store";
import { getPack } from "@/lib/domain/packs";
import { getBudgetTotals } from "@/lib/domain/engine/budget";
import { getNextTasks } from "@/lib/domain/engine/plan";
import { auditPlan } from "@/lib/domain/engine/audit";
import { getWeeklyDigest } from "@/lib/domain/reminders";
import { formatMuhuratTime } from "@/lib/domain/muhurat";
import { daysUntil, formatDate, formatMoney } from "@/lib/utils/format";

interface OverviewProps {
  onNavigate: (view: "functions" | "budget" | "timeline" | "vendors" | "ideas") => void;
  onOpenAssistant: () => void;
}

export function Overview({ onNavigate, onOpenAssistant }: OverviewProps) {
  const { plan, updatePlan } = usePlan();
  if (!plan) return null;
  const pack = getPack(plan.brief.eventType);
  const totals = getBudgetTotals(plan.budget);
  const days = daysUntil(plan.brief.date);
  const nextTasks = getNextTasks(plan);
  const completed = plan.timeline.filter((task) => task.status === "done").length;
  const booked = plan.vendors.filter((vendor) => vendor.status === "booked").length;
  const allocationPercent = Math.min(100, totals.planned / Math.max(1, plan.brief.budget) * 100);
  const nextFunction = [...plan.functions].filter((item) => daysUntil(item.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
  const audit = auditPlan(plan);
  const digest = getWeeklyDigest(plan);

  return <div className="space-y-6">
    <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card className="grain relative min-w-0 overflow-hidden bg-ink p-7 text-white sm:p-9" data-tour="overview-hero">
        <div className="absolute -top-24 -right-24 size-80 rounded-full border-[55px] border-white/[.035]" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3"><Eyebrow className="text-[#dfa990]">{pack.eyebrow}</Eyebrow><span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/60">{plan.ai.mode === "live" ? "AI personalized" : "Smart local plan"}</span></div>
          <h2 className="mt-5 max-w-xl font-display text-[clamp(2rem,4vw,3.3rem)] leading-[1.08] font-medium tracking-[-.04em] text-balance">{plan.ai.headline}</h2>
          <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div><div className="flex items-baseline gap-2"><strong className="font-display text-6xl leading-none font-normal">{days > 0 ? days : 0}</strong><span className="text-sm text-white/55">days</span></div><p className="mt-2 text-xs text-white/50">until {formatDate(plan.brief.date, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</p></div>
            <div className="h-12 w-px bg-white/15" />
            <div><p className="flex items-center gap-2 text-sm text-white/70"><Users size={15} aria-hidden="true" />{`${plan.brief.guests} ${pack.terminology.guest}s`}</p><p className="mt-2 text-xs text-white/50">{plan.brief.location}</p></div>
          </div>
          {(nextFunction || plan.muhurat) && <div className="mt-6 space-y-1 border-t border-white/10 pt-4 text-xs text-white/55">
            {nextFunction && <p>Next: <span className="font-semibold text-white/80">{nextFunction.name}</span> · {formatDate(nextFunction.date)}</p>}
            {plan.muhurat && <p>Muhurat: <span className="font-semibold text-white/80">{formatDate(plan.muhurat.date)}</span> · {formatMuhuratTime(plan.muhurat)}</p>}
          </div>}
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:p-8" data-tour="budget-health">
        <ProgressRing value={allocationPercent} size={148} label={`${Math.round(allocationPercent)} percent of budget allocated`}><strong className="font-display text-3xl font-medium">{Math.round(allocationPercent)}%</strong><span className="text-[9px] font-bold tracking-wider text-muted uppercase">allocated</span></ProgressRing>
        <div className="min-w-0"><Eyebrow>Budget health</Eyebrow><h3 className="mt-2 font-display text-2xl font-medium">{totals.planned > plan.brief.budget ? "Needs a rebalance" : "Room to breathe"}</h3><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted">Total budget</dt><dd className="font-semibold">{formatMoney(plan.brief.budget)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Still unallocated</dt><dd className="font-semibold text-sage">{formatMoney(Math.max(0, plan.brief.budget - totals.planned))}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">Actual spend</dt><dd className="font-semibold">{formatMoney(totals.actual)}</dd></div></dl><button onClick={() => onNavigate("budget")} className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-clay">Open budget <ArrowRight size={13} /></button></div>
      </Card>
    </section>

    <Card className="flex flex-wrap items-center gap-4 p-5 sm:px-7" aria-label="This week's reminders">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${digest.overdue.length > 0 ? "bg-red-50 text-red-700" : "bg-blush text-clay"}`}><BellRing size={19} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{digest.overdue.length > 0 ? "Some things need you now." : "This week"}</p><p className="mt-1 text-xs leading-5 text-muted">{digest.message}</p>{digest.top.length > 0 && <p className="mt-1 truncate text-[11px] text-muted">{digest.top.map((task) => task.title).join(" · ")}</p>}</div>
      <Button variant="ghost" size="sm" onClick={() => onNavigate("timeline")}>Open timeline <ArrowRight size={13} /></Button>
    </Card>

    <section aria-labelledby="next-moves" className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card className="p-6 sm:p-8" data-tour="next-moves">
        <div className="mb-5 flex items-center justify-between"><div><Eyebrow>Keep the momentum</Eyebrow><h2 id="next-moves" className="mt-2 font-display text-3xl font-medium">Your next three moves</h2></div><Button variant="ghost" size="sm" onClick={() => onNavigate("timeline")}>Full timeline <ArrowRight size={14} /></Button></div>
        <div className="divide-y divide-line">{nextTasks.map((task, index) => <article key={task.id} className="group flex gap-4 py-5 first:pt-1"><button onClick={() => updatePlan((current) => ({ ...current, timeline: current.timeline.map((item) => item.id === task.id ? { ...item, status: "done" } : item) }))} className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-sage hover:bg-[#e8ede6] hover:text-sage" aria-label={`Mark “${task.title}” complete`}><Circle size={17} aria-hidden="true" /></button><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-clay">0{index + 1}</span><h3 className="font-display text-xl font-medium">{task.title}</h3>{task.priority === "high" && <Badge className="border-clay/20 bg-blush text-clay">Priority</Badge>}</div><p className="mt-2 text-sm leading-6 text-muted">{task.description}</p><p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted"><Clock3 size={12} aria-hidden="true" />{task.phase} · by {formatDate(task.dueDate)}</p></div></article>)}</div>
      </Card>

      <Card className="relative overflow-hidden border-clay/20 bg-blush/70 p-6 sm:p-8">
        <Sparkles className="absolute top-5 right-5 text-clay/30" size={35} strokeWidth={1} aria-hidden="true" />
        <Eyebrow>A little planning wisdom</Eyebrow>
        <div className="mt-5 space-y-5">{plan.ai.insights.map((insight, index) => <div key={insight} className="flex gap-3"><span className="font-display text-lg text-clay/60">0{index + 1}</span><p className="text-sm leading-6 text-ink/80">{insight}</p></div>)}</div>
        <Button variant="secondary" className="mt-7 w-full bg-white/60" onClick={onOpenAssistant}><Bot size={16} aria-hidden="true" /> Talk it through with AI</Button>
      </Card>
    </section>

    <section aria-label="Planning progress" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { icon: CalendarRange, label: "Functions", value: `${plan.functions.length}`, detail: "across the wedding", action: () => onNavigate("functions") },
        { icon: CalendarDays, label: "Timeline", value: `${completed}/${plan.timeline.length}`, detail: "milestones complete", action: () => onNavigate("timeline") },
        { icon: Store, label: "Vendor team", value: `${booked}/${plan.vendors.length}`, detail: "key partners booked", action: () => onNavigate("vendors") },
        { icon: Lightbulb, label: "Your idea book", value: String(plan.ideas.filter((idea) => idea.saved).length), detail: "personal ideas saved", action: () => onNavigate("ideas") },
      ].map(({ icon: Icon, label, value, detail, action }) => <button key={label} onClick={action} className="group rounded-3xl border border-line bg-paper p-5 text-left transition hover:-translate-y-0.5 hover:border-clay/40"><div className="flex items-center justify-between"><Icon size={18} className="text-clay" aria-hidden="true" /><ArrowRight size={15} className="text-muted transition group-hover:translate-x-1" aria-hidden="true" /></div><p className="mt-5 font-display text-3xl font-medium">{value}</p><p className="mt-1 text-xs font-semibold">{label} <span className="font-normal text-muted">· {detail}</span></p></button>)}
    </section>

    <section aria-labelledby="audit-title">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><Eyebrow>Before you book</Eyebrow><h2 id="audit-title" className="mt-2 font-display text-3xl font-medium">What is still open?</h2></div>
          <Button variant="secondary" size="sm" onClick={onOpenAssistant}><Bot size={14} aria-hidden="true" /> Ask Eventas</Button>
        </div>
        {audit.gaps.length > 0
          ? <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{audit.gaps.slice(0, 3).map((item) => <li key={item.title} className="rounded-2xl border border-line bg-bone/40 p-4"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p></li>)}</ul>
          : <p className="mt-4 text-sm leading-6 text-muted">The major wedding pillars are covered. Keep the contingency protected and reconfirm vendor balances in the final week.</p>}
        {audit.warnings.length > 0 && <p className="mt-4 text-xs leading-5 text-muted"><strong className="text-ink">{audit.warnings.length} warning{audit.warnings.length > 1 ? "s" : ""}:</strong> {audit.warnings.slice(0, 3).map((item) => item.title).join(" · ")}</p>}
      </Card>
    </section>
  </div>;
}
