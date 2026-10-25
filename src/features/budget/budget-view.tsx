"use client";

import { useState } from "react";
import { ArrowRight, Check, LoaderCircle, RotateCcw, Sparkles, TriangleAlert, WandSparkles } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { getBudgetTotals } from "@/lib/domain/engine/budget";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { rebalanceResponseSchema } from "@/lib/validation/schemas";
import { isSafeAllocation } from "@/lib/ai/rebalance";
import { BudgetDonut } from "./budget-donut";
import { cn } from "@/lib/utils/cn";

interface Proposal { rationale: string; allocation: Record<string, number>; mode?: string }

export function BudgetView() {
  const { plan, updatePlan } = usePlan();
  const [showRebalance, setShowRebalance] = useState(false);
  const [goal, setGoal] = useState("Save 5% without affecting our top priorities");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [status, setStatus] = useState("");
  if (!plan) return null;
  const totals = getBudgetTotals(plan.budget);
  const unallocated = plan.brief.budget - totals.planned;

  function updateCategory(id: string, field: "planned" | "actual", value: number) {
    updatePlan((current) => ({ ...current, budget: current.budget.map((category) => category.id === id ? { ...category, [field]: Math.max(0, value || 0) } : category) }));
  }

  async function getProposal() {
    if (!plan || goal.trim().length < 2) return;
    setLoading(true); setProposal(null); setStatus("");
    try {
      const response = await fetch("/api/ai/rebalance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, goal }) });
      if (!response.ok) throw new Error("Request failed");
      const data: unknown = await response.json();
      const result = rebalanceResponseSchema.safeParse(data);
      if (!result.success || !isSafeAllocation(plan, result.data.allocation)) throw new Error("Invalid proposal");
      setProposal({ ...result.data, mode: (data as { mode?: string }).mode });
    } catch { setStatus("We couldn’t create a proposal just now. Try a simpler goal, like “save 5%”."); }
    setLoading(false);
  }

  const changes = proposal && plan ? plan.budget.filter((category) => Math.round(category.planned) !== Math.round(proposal.allocation[category.id] ?? category.planned)) : [];

  return <div className="space-y-6">
    {plan.functions.length > 1 && <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><Eyebrow>Per-function targets</Eyebrow><h2 className="mt-1 font-display text-2xl font-medium">A budget for every function.</h2></div><p className="text-xs text-muted">{formatMoney(plan.functions.reduce((sum, item) => sum + item.budget, 0))} of {formatMoney(plan.brief.budget)} targeted</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{plan.functions.map((item) => <div key={item.id} className="rounded-2xl border border-line bg-bone/40 p-3"><div className="flex justify-between gap-2 text-xs"><span className="truncate font-semibold">{item.name}</span><span>{formatMoney(item.budget)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-clay" style={{ width: `${Math.min(100, item.budget / Math.max(1, plan.brief.budget) * 100)}%` }} /></div><p className="mt-1.5 text-[10px] text-muted">{item.guestCount} guests · {formatDate(item.date)}</p></div>)}</div>
      <p className="mt-3 text-[11px] text-muted">Targets are planning guides. Edit them in <strong className="text-ink">Functions</strong>; the master budget below remains the source of truth.</p>
    </Card>}
    <section className="grid gap-6 xl:grid-cols-[1fr_1.45fr]">
      <Card className="p-6 sm:p-8"><BudgetDonut categories={plan.budget} total={totals.planned} /><div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-2">{[...plan.budget].sort((a, b) => b.planned - a.planned).slice(0, 6).map((category) => <div key={category.id} className="flex items-center gap-2 text-[11px]"><span className="size-2 shrink-0 rounded-full" style={{ background: category.color }} /><span className="truncate text-muted">{category.name}</span><span className="ml-auto font-semibold">{Math.round(category.planned / Math.max(1, totals.planned) * 100)}%</span></div>)}</div></Card>
      <div className="grid content-start gap-5">
        <Card className={cn("p-6 sm:p-7", unallocated < 0 && "border-red-300 bg-red-50/50")}><div className="flex flex-wrap items-start justify-between gap-4"><div><Eyebrow>Your working budget</Eyebrow><h2 className="mt-2 font-display text-4xl font-medium">{formatMoney(totals.planned)}</h2><p className="mt-1 text-xs text-muted">of {formatMoney(plan.brief.budget)} total</p></div><Badge className={unallocated < 0 ? "border-red-200 bg-red-100 text-red-800" : "border-sage/20 bg-[#e8ede6] text-sage"}>{unallocated < 0 ? `${formatMoney(Math.abs(unallocated))} over` : `${formatMoney(unallocated)} unallocated`}</Badge></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-soft"><div className={cn("h-full rounded-full transition-all", unallocated < 0 ? "bg-red-600" : "bg-clay")} style={{ width: `${Math.min(100, totals.planned / plan.brief.budget * 100)}%` }} /></div><div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm"><div><span className="block text-xs text-muted">Actual spend</span><strong className="mt-1 block font-display text-xl">{formatMoney(totals.actual)}</strong></div><div><span className="block text-xs text-muted">Planned remaining</span><strong className="mt-1 block font-display text-xl">{formatMoney(totals.remaining)}</strong></div></div></Card>
        <Card className="border-clay/20 bg-blush/60 p-6 sm:p-7"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/70 text-clay"><WandSparkles size={20} aria-hidden="true" /></span><div><h2 className="font-display text-2xl font-medium">Make a trade-off, safely.</h2><p className="mt-2 text-sm leading-6 text-muted">Tell the assistant what you want to change. You’ll see the exact before-and-after before anything is applied.</p><Button variant="secondary" className="mt-4 bg-white/70" onClick={() => { setShowRebalance((value) => !value); setProposal(null); }} aria-expanded={showRebalance}><Sparkles size={15} /> Rebalance with AI <ArrowRight size={14} /></Button></div></div>
          {showRebalance && <div className="mt-6 border-t border-clay/15 pt-5"><label htmlFor="goal" className="text-xs font-semibold">What would you like to achieve?</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={500} /><Button onClick={getProposal} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={16} /> : "Propose"}</Button></div>{status && <p role="alert" className="mt-3 text-sm text-red-700">{status}</p>}{loading && <p className="mt-4 text-sm text-muted" role="status">Finding the gentlest trade-offs…</p>}{proposal && <div className="mt-5 rounded-2xl bg-white/75 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-clay"><Sparkles size={14} /> Proposal · {proposal.mode === "live" ? "Groq AI" : "Smart local logic"}</div><p className="mt-3 text-sm leading-6 text-muted">{proposal.rationale}</p><div className="mt-4 space-y-2">{changes.map((category) => <div key={category.id} className="flex items-center gap-3 text-xs"><span className="flex-1">{category.name}</span><span className="text-muted line-through">{formatMoney(category.planned)}</span><ArrowRight size={12} /><strong>{formatMoney(proposal.allocation[category.id] ?? 0)}</strong></div>)}</div><div className="mt-5 flex gap-2"><Button size="sm" onClick={() => { updatePlan((current) => ({ ...current, budget: current.budget.map((category) => ({ ...category, planned: Math.round(proposal.allocation[category.id] ?? category.planned) })) })); setProposal(null); setStatus("Proposal applied. Your budget has been updated."); }}><Check size={14} /> Apply proposal</Button><Button size="sm" variant="ghost" onClick={() => setProposal(null)}>Cancel</Button></div></div>}</div>}
        </Card>
      </div>
    </section>

    <section aria-labelledby="budget-details"><Card className="overflow-hidden"><div className="border-b border-line p-6 sm:px-8"><Eyebrow>Planned versus actual</Eyebrow><h2 id="budget-details" className="mt-2 font-display text-3xl font-medium">Every rupee has a job.</h2><p className="mt-2 text-sm text-muted">Edit planned amounts as quotes arrive. Enter actual spend to see what’s left. Vendor quotes may exclude 18% GST and service charge—ask for an all-inclusive number.</p></div><div className="hidden grid-cols-[1fr_130px_130px_130px_40px] gap-4 border-b border-line bg-bone/50 px-8 py-3 text-[10px] font-bold tracking-wider text-muted uppercase md:grid"><span>Category</span><span className="text-right">Suggested</span><span className="text-right">Planned</span><span className="text-right">Actual</span><span /></div><ul className="divide-y divide-line">{plan.budget.map((category) => { const over = category.actual > category.planned; return <li key={category.id} className="grid gap-4 px-5 py-5 sm:px-8 md:grid-cols-[1fr_130px_130px_130px_40px] md:items-center"><div className="flex gap-3"><span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: category.color }} /><div><h3 className="text-sm font-semibold">{category.name}{category.id === "contingency" && <Badge className="ml-2">Protected</Badge>}</h3><p className="mt-1 max-w-md text-xs leading-5 text-muted">{category.description}</p>{category.perGuest && <p className="mt-1 text-[10px] font-medium text-clay">Scales with guest count</p>}{over && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-700"><TriangleAlert size={13} />{formatMoney(category.actual - category.planned)} over plan</p>}</div></div><div className="flex items-center justify-between md:justify-end"><span className="text-xs text-muted md:hidden">Suggested</span><span className="text-sm text-muted">{formatMoney(category.recommended)}</span></div><label className="flex items-center justify-between gap-3 md:block"><span className="text-xs text-muted md:hidden">Planned</span><span className="relative block"><span className="absolute top-2.5 left-3 text-xs text-muted">₹</span><Input type="number" min={0} step={5000} value={category.planned} onChange={(event) => updateCategory(category.id, "planned", Number(event.target.value))} aria-label={`${category.name} planned amount`} className="w-full py-2 pl-7 text-right text-sm md:w-[130px]" /></span></label><label className="flex items-center justify-between gap-3 md:block"><span className="text-xs text-muted md:hidden">Actual</span><span className="relative block"><span className="absolute top-2.5 left-3 text-xs text-muted">₹</span><Input type="number" min={0} step={5000} value={category.actual} onChange={(event) => updateCategory(category.id, "actual", Number(event.target.value))} aria-label={`${category.name} actual spend`} className={cn("w-full py-2 pl-7 text-right text-sm md:w-[130px]", over && "border-red-500")} /></span></label><Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => updateCategory(category.id, "planned", category.recommended)} aria-label={`Reset ${category.name} to suggested amount`} title="Reset to suggested"><RotateCcw size={14} /></Button></li>; })}</ul><div className="flex flex-wrap justify-end gap-8 border-t border-line bg-bone/50 px-6 py-5 text-sm sm:px-8"><span className="text-muted">Total planned <strong className="ml-2 font-display text-xl text-ink">{formatMoney(totals.planned)}</strong></span><span className="text-muted">Actual <strong className="ml-2 font-display text-xl text-ink">{formatMoney(totals.actual)}</strong></span></div></Card></section>
    <p className="sr-only" aria-live="polite">{status}</p>
  </div>;
}
