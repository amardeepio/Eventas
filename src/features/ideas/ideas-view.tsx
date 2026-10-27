"use client";

import { useState } from "react";
import { Bookmark, Check, Flower2, Lightbulb, LoaderCircle, Music2, RefreshCw, Sparkles, UtensilsCrossed, Wand2 } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/storage/plan-store";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const kindIcons = { Concept: Wand2, "Signature moment": Sparkles, Menu: UtensilsCrossed, Playlist: Music2, Decor: Flower2, Favors: Lightbulb } as const;

export function IdeasView() {
  const { plan, updatePlan, enrichWithAi } = usePlan();
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [loading, setLoading] = useState(false);
  if (!plan) return null;
  const savedCount = plan.ideas.filter((idea) => idea.saved).length;
  const visible = filter === "saved" ? plan.ideas.filter((idea) => idea.saved) : plan.ideas;

  async function refresh() {
    if (!plan) return;
    setLoading(true);
    await enrichWithAi(plan);
    setLoading(false);
  }

  return <div className="space-y-6">
    <Card className="grain relative overflow-hidden bg-[#5d7161] p-7 text-white sm:p-9" data-tour="ideas-hero"><Sparkles className="absolute -right-5 -bottom-8 size-48 text-white/[.06]" strokeWidth={.8} /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div className="max-w-2xl"><Eyebrow className="text-[#dce4d7]">Made for {plan.brief.hostNames}</Eyebrow><h2 className="mt-3 font-display text-4xl leading-tight font-medium tracking-[-.03em]">Not the internet’s event.<br /><em className="font-light">Yours.</em></h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/65">Shaped by your {plan.brief.vibe} direction, {plan.brief.guests} guests, {formatMoney(plan.brief.budget)} budget, and everything you told us matters.</p></div><Button variant="secondary" className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={refresh} disabled={loading}>{loading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}{loading ? "Thinking…" : "Fresh ideas"}</Button></div></Card>
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex rounded-full border border-line bg-paper p-1" role="group" aria-label="Filter ideas"><button onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={cn("min-h-9 rounded-full px-4 text-xs font-semibold", filter === "all" ? "bg-ink text-white" : "text-muted")}>All ideas</button><button onClick={() => setFilter("saved")} aria-pressed={filter === "saved"} className={cn("min-h-9 rounded-full px-4 text-xs font-semibold", filter === "saved" ? "bg-ink text-white" : "text-muted")}>Saved · {savedCount}</button></div><p className="text-xs text-muted">{plan.ai.mode === "live" ? "Personalized with Groq AI" : "Curated by smart local planning logic"}</p></div>
    {visible.length === 0 ? <Card className="p-14 text-center"><Bookmark className="mx-auto text-clay" size={32} /><h2 className="mt-4 font-display text-3xl">Your idea book is waiting.</h2><p className="mt-2 text-sm text-muted">Save an idea and it will become part of your assistant’s context.</p><Button variant="secondary" className="mt-5" onClick={() => setFilter("all")}>Browse all ideas</Button></Card> : <section aria-label="Personalized ideas" className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((idea, index) => { const Icon = kindIcons[idea.kind as keyof typeof kindIcons] ?? Lightbulb; return <Card key={idea.id} className={cn("group relative flex min-h-[330px] flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg", idea.saved && "border-clay/35 bg-blush/25")}><div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-blush text-clay"><Icon size={20} strokeWidth={1.5} /></span><button onClick={() => updatePlan((current) => ({ ...current, ideas: current.ideas.map((item) => item.id === idea.id ? { ...item, saved: !item.saved } : item) }))} aria-pressed={idea.saved} aria-label={idea.saved ? `Remove “${idea.title}” from saved ideas` : `Save “${idea.title}”`} className={cn("grid size-11 place-items-center rounded-full transition", idea.saved ? "bg-clay text-white" : "text-muted hover:bg-soft hover:text-clay")}>{idea.saved ? <Check size={18} /> : <Bookmark size={18} />}</button></div><p className="mt-6 text-[10px] font-bold tracking-[.16em] text-clay uppercase">{idea.kind}</p><h2 className="mt-2 font-display text-[26px] leading-[1.12] font-medium tracking-[-.025em]">{idea.title}</h2><p className="mt-3 text-sm leading-6 text-muted">{idea.description}</p><div className="mt-auto flex flex-wrap items-center gap-2 pt-6">{idea.tags.map((tag) => <Badge key={tag} className="bg-transparent font-normal">{tag}</Badge>)}<span className="ml-auto text-[10px] font-semibold text-muted">{idea.cost > 0 ? `Est. +${formatMoney(idea.cost)}` : "Little / no extra cost"}</span></div><span className="absolute right-5 bottom-2 font-display text-5xl text-ink/[.025]">0{index + 1}</span></Card>; })}</section>}
    <p className="text-center text-xs text-muted">Cost figures are rough planning estimates, not live prices. Validate accessibility and dietary details with your vendors.</p>
  </div>;
}
