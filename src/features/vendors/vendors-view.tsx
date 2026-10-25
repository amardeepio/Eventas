"use client";

import { useState } from "react";
import { Check, ChevronDown, Clipboard, CircleAlert, LoaderCircle, MessageSquareText, Sparkles, Store, X } from "lucide-react";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { formatMoney } from "@/lib/utils/format";
import type { Vendor, VendorStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

const statusLabels: Record<VendorStatus, string> = { idea: "Ideas", shortlisted: "Shortlisted", contacted: "Contacted", booked: "Booked" };

export function VendorsView() {
  const { plan, updatePlan } = usePlan();
  const [copied, setCopied] = useState("");
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftMode, setDraftMode] = useState("");
  if (!plan) return null;
  const booked = plan.vendors.filter((vendor) => vendor.status === "booked").length;
  const quotes = plan.vendors.reduce((sum, vendor) => sum + vendor.quote, 0);
  const draftVendor = plan.vendors.find((vendor) => vendor.id === draftFor);

  function updateVendor(id: string, patch: Partial<Vendor>) {
    updatePlan((current) => ({ ...current, vendors: current.vendors.map((vendor) => vendor.id === id ? { ...vendor, ...patch } : vendor) }));
  }
  async function copyQuestions(id: string, questions: string[]) {
    try { await navigator.clipboard.writeText(questions.map((question) => `- ${question}`).join("\n")); setCopied(id); setTimeout(() => setCopied(""), 2000); }
    catch { setCopied(""); }
  }
  async function draftEnquiry(vendor: Vendor) {
    setDraftFor(vendor.id); setDraftBody(""); setDraftError(""); setDraftMode(""); setDraftLoading(true);
    try {
      const response = await fetch("/api/ai/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, vendorId: vendor.id }),
      });
      const data = await response.json() as { body?: unknown; mode?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not draft that just now.");
      if (typeof data.body !== "string" || data.body.length < 20) throw new Error("The draft came back incomplete. Try again.");
      setDraftBody(data.body);
      setDraftMode(data.mode ?? "demo");
    } catch (caught) {
      setDraftError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setDraftLoading(false);
    }
  }
  async function copyDraft() {
    try { await navigator.clipboard.writeText(draftBody); setCopied("draft"); setTimeout(() => setCopied(""), 2000); }
    catch { setCopied(""); }
  }

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-3"><Card className="p-6"><Store size={19} className="text-clay" /><p className="mt-4 font-display text-3xl">{booked}<span className="text-lg text-muted">/{plan.vendors.length}</span></p><p className="mt-1 text-xs text-muted">key vendor categories booked</p></Card><Card className="p-6"><MessageSquareText size={19} className="text-clay" /><p className="mt-4 font-display text-3xl">{plan.vendors.filter((vendor) => vendor.status === "contacted").length}</p><p className="mt-1 text-xs text-muted">conversations in progress</p></Card><Card className="p-6"><Clipboard size={19} className="text-clay" /><p className="mt-4 font-display text-3xl">{formatMoney(quotes)}</p><p className="mt-1 text-xs text-muted">quotes collected so far</p></Card></section>
    <div className="rounded-2xl border border-line bg-paper/60 p-4 text-xs leading-5 text-muted"><strong className="text-ink">A good vendor call is specific.</strong> Ask every question, get inclusions and cancellation terms in writing, and never treat a planning estimate as a live quote.</div>
    {draftVendor && <Card className="border-clay/25 bg-blush/25 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><Eyebrow>AI enquiry draft</Eyebrow><h2 className="mt-1 font-display text-2xl font-medium">A message for your {draftVendor.category.toLowerCase()}.</h2></div>
        <Button variant="ghost" size="icon" onClick={() => setDraftFor(null)} aria-label="Close draft"><X size={18} /></Button>
      </div>
      {draftLoading ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="animate-spin" size={15} />Writing a specific, plan-aware message…</p>
        : draftError ? <p role="alert" className="mt-4 text-sm font-medium text-red-700">{draftError}</p>
        : <>
          <label htmlFor="vendor-draft" className="sr-only">Draft message for {draftVendor.category}</label>
          <Textarea id="vendor-draft" readOnly value={draftBody} className="mt-4 min-h-44 bg-white/80 text-sm leading-6" />
          <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" onClick={copyDraft}>{copied === "draft" ? <Check size={14} /> : <Clipboard size={14} />}{copied === "draft" ? "Copied" : "Copy message"}</Button><span className="text-[11px] text-muted">{draftMode === "live" ? "Groq AI draft" : "Smart local draft"} · review and personalise before sending.</span></div>
        </>}
    </Card>}
    <section aria-label="Vendor checklist" className="grid items-start gap-5 xl:grid-cols-2">{plan.vendors.map((vendor) => { const budget = plan.budget.find((category) => category.id === vendor.budgetCategoryId); const over = budget && vendor.quote > budget.planned; return <Card key={vendor.id} className={cn("overflow-hidden", vendor.status === "booked" && "border-sage/35")}><div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4"><div><div className="flex items-center gap-2"><h2 className="font-display text-2xl font-medium">{vendor.category}</h2>{vendor.status === "booked" && <span className="grid size-5 place-items-center rounded-full bg-sage text-white"><Check size={12} /></span>}</div><p className="mt-1 text-xs text-muted">Budget home: {budget?.name ?? "General"} · {formatMoney(budget?.planned ?? 0)} planned</p></div><div className="flex flex-wrap items-center gap-2"><Select value={vendor.status} onChange={(event) => updateVendor(vendor.id, { status: event.target.value as VendorStatus })} aria-label={`${vendor.category} status`} className="w-36 py-2 text-xs">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Button variant="secondary" size="sm" onClick={() => void draftEnquiry(vendor)}><Sparkles size={13} aria-hidden="true" /> Draft enquiry</Button></div></div><div className="grid gap-4 px-6 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-bold tracking-wider text-muted uppercase">Quoted amount</span><div className="relative"><span className="absolute top-3.5 left-4 text-sm text-muted">₹</span><Input type="number" min={0} value={vendor.quote} onChange={(event) => updateVendor(vendor.id, { quote: Math.max(0, Number(event.target.value)) })} className="py-2.5 pl-8" aria-label={`${vendor.category} quoted amount`} /></div>{over && <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-red-700"><CircleAlert size={12} />Above this category’s plan</p>}</label><label><span className="mb-1.5 block text-[10px] font-bold tracking-wider text-muted uppercase">Notes</span><Textarea value={vendor.notes} onChange={(event) => updateVendor(vendor.id, { notes: event.target.value.slice(0, 2000) })} placeholder="Contact, inclusions, deposit…" aria-label={`${vendor.category} notes`} className="min-h-[46px] py-2.5 text-xs" /></label></div><div className="mt-5 border-t border-line px-6 py-4"><details className="group"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-xs font-semibold"><span>Questions to ask <span className="ml-1 font-normal text-muted">({vendor.questions.length})</span></span><ChevronDown size={15} className="transition group-open:rotate-180" /></summary><ul className="mt-3 space-y-2.5">{vendor.questions.map((question) => <li key={question} className="flex gap-2 text-xs leading-5 text-muted"><span className="mt-2 size-1 shrink-0 rounded-full bg-clay" />{question}</li>)}</ul><Button variant="ghost" size="sm" className="mt-3" onClick={() => copyQuestions(vendor.id, vendor.questions)}>{copied === vendor.id ? <Check size={13} /> : <Clipboard size={13} />}{copied === vendor.id ? "Copied" : "Copy questions"}</Button></details></div><div className="border-t border-line bg-bone/40 px-6 py-4"><details className="group"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted"><span className="flex items-center gap-2"><CircleAlert size={13} />Watch for these red flags</span><ChevronDown size={14} className="transition group-open:rotate-180" /></summary><ul className="mt-3 flex flex-wrap gap-2">{vendor.redFlags.map((flag) => <li key={flag}><Badge className="bg-paper font-normal">{flag}</Badge></li>)}</ul></details></div></Card>; })}</section>
    <p className="sr-only" aria-live="polite">{copied ? "Questions copied to clipboard" : ""}</p>
  </div>;
}
