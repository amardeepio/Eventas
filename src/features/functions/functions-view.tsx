"use client";

import { useState } from "react";
import { CalendarDays, CalendarPlus, Clock3, MapPin, Plus, Split, Trash2, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Eyebrow } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { FUNCTION_KINDS, type Brief, type FunctionDraft, type FunctionKind } from "@/lib/domain/types";
import { functionKindLabel, functionKindMeta, resolveFunctions, toFunctionDraft } from "@/lib/domain/functions";
import { getTradition } from "@/lib/domain/traditions";
import { findMuhuratSuggestion, formatMuhuratTime, MUHURAT_CAVEAT } from "@/lib/domain/muhurat";
import { daysUntil, formatDate, formatMoney, addDays, parseISODate, toISODate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function makeDraft(kind: FunctionKind, brief: Brief): FunctionDraft {
  const meta = functionKindMeta(kind);
  return {
    kind,
    name: kind === "ceremony" ? getTradition(brief.tradition).ceremonyLabel : functionKindLabel(kind),
    date: brief.date,
    startTime: meta.start,
    endTime: meta.end,
    venue: brief.location,
    guestCount: brief.guests,
    dressCode: meta.dress,
    hostSide: "both",
  };
}

export function FunctionsView() {
  const { plan, updatePlan } = usePlan();
  const [draft, setDraft] = useState<FunctionDraft | null>(null);
  const [editingMuhurat, setEditingMuhurat] = useState(false);
  if (!plan) return null;

  const functions = [...plan.functions].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const totalGuests = functions.reduce((sum, item) => sum + item.guestCount, 0);
  const totalTarget = functions.reduce((sum, item) => sum + item.budget, 0);
  const next = functions.find((item) => daysUntil(item.date) >= 0);
  const muhurat = plan.muhurat;

  function updateFunction(id: string, patch: Partial<typeof functions[number]>) {
    updatePlan((current) => {
      const previous = current.functions.find((item) => item.id === id);
      const nextFunctions = current.functions.map((item) => item.id === id ? { ...item, ...patch } : item);
      const delta = patch.date && /^\d{4}-\d{2}-\d{2}$/.test(patch.date) && previous
        ? Math.round((parseISODate(patch.date).getTime() - parseISODate(previous.date).getTime()) / 86_400_000)
        : 0;
      const ceremonyMoved = Boolean(delta && previous?.kind === "ceremony");
      const timeline = delta
        ? current.timeline.map((task) => {
          const followsFunction = task.functionId === id;
          const followsWedding = !task.functionId && ceremonyMoved;
          return followsFunction || followsWedding
            ? { ...task, dueDate: toISODate(addDays(parseISODate(task.dueDate), delta)) }
            : task;
        })
        : current.timeline;
      const muhurat = ceremonyMoved && current.muhurat && current.muhurat.date !== patch.date ? null : current.muhurat;
      return {
        ...current,
        functions: nextFunctions,
        timeline,
        muhurat,
        brief: {
          ...current.brief,
          date: ceremonyMoved && patch.date ? patch.date : current.brief.date,
          muhurat: muhurat ?? undefined,
          functions: nextFunctions.map(toFunctionDraft),
        },
      };
    });
  }

  function removeFunction(id: string) {
    updatePlan((current) => {
      if (current.functions.length <= 1) return current;
      const nextFunctions = current.functions.filter((item) => item.id !== id);
      const resolved = resolveFunctions({ ...current.brief, functions: nextFunctions.map(toFunctionDraft) });
      const withBudget = nextFunctions.map((item, index) => ({ ...item, budget: resolved[index]?.budget ?? item.budget }));
      return { ...current, functions: withBudget, brief: { ...current.brief, functions: withBudget.map(toFunctionDraft) } };
    });
  }

  function addFunction() {
    if (!draft) return;
    updatePlan((current) => {
      const added = {
        ...draft,
        id: `${draft.kind}-${current.functions.length + 1}`,
        budget: 0,
        status: "planned" as const,
      };
      const nextFunctions = [...current.functions, added];
      const resolved = resolveFunctions({ ...current.brief, functions: nextFunctions.map(toFunctionDraft) });
      const withBudget = nextFunctions.map((item, index) => ({ ...item, budget: resolved[index]?.budget ?? item.budget }));
      return { ...current, functions: withBudget, brief: { ...current.brief, functions: withBudget.map(toFunctionDraft) } };
    });
    setDraft(null);
  }

  function splitBudget() {
    updatePlan((current) => {
      const resolved = resolveFunctions({ ...current.brief, functions: current.functions.map(toFunctionDraft) });
      const nextFunctions = current.functions.map((item, index) => ({ ...item, budget: resolved[index]?.budget ?? item.budget }));
      return { ...current, functions: nextFunctions };
    });
  }

  function updateMuhurat(patch: Partial<NonNullable<typeof muhurat>>) {
    updatePlan((current) => {
      if (!current.muhurat) return current;
      const nextMuhurat = { ...current.muhurat, ...patch };
      return { ...current, muhurat: nextMuhurat, brief: { ...current.brief, muhurat: nextMuhurat } };
    });
  }

  function addMuhurat() {
    updatePlan((current) => {
      const nextMuhurat = { date: current.brief.date, start: "", end: "", label: "Muhurat", source: "Entered by you" };
      return { ...current, muhurat: nextMuhurat, brief: { ...current.brief, muhurat: nextMuhurat } };
    });
    setEditingMuhurat(true);
  }

  function removeMuhurat() {
    updatePlan((current) => ({ ...current, muhurat: null, brief: { ...current.brief, muhurat: undefined } }));
    setEditingMuhurat(false);
  }

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { icon: CalendarDays, label: "Functions", value: String(functions.length), detail: "across the wedding" },
        { icon: Users, label: "Guest seats", value: String(totalGuests), detail: "counted per function" },
        { icon: WalletCards, label: "Target allocation", value: formatMoney(totalTarget), detail: `of ${formatMoney(plan.brief.budget)}` },
        { icon: Clock3, label: "Next function", value: next ? formatDate(next.date) : "—", detail: next?.name ?? "Add a function" },
      ].map(({ icon: Icon, label, value, detail }) => <Card key={label} className="p-5"><Icon size={18} className="text-clay" aria-hidden="true" /><p className="mt-4 font-display text-2xl font-medium">{value}</p><p className="mt-1 text-xs font-semibold">{label} <span className="font-normal text-muted">· {detail}</span></p></Card>)}
    </section>

    <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Card className={cn("p-6", muhurat ? "border-clay/25 bg-blush/30" : "")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Muhurat</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-medium">{muhurat ? formatDate(muhurat.date) : "No muhurat yet"}</h2>
            <p className="mt-1 text-xs text-muted">{muhurat ? `${formatMuhuratTime(muhurat)} · ${muhurat.label}` : "Add the window from your pandit so the timeline can anchor to it."}</p>
          </div>
          <div className="flex gap-2">
            {muhurat ? <Button variant="ghost" size="sm" onClick={() => setEditingMuhurat((value) => !value)}>{editingMuhurat ? "Done" : "Edit"}</Button> : <Button variant="secondary" size="sm" onClick={addMuhurat}><CalendarPlus size={14} aria-hidden="true" /> Add muhurat</Button>}
          </div>
        </div>
        {muhurat && editingMuhurat && <div className="mt-5 grid gap-3 border-t border-clay/15 pt-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="muhurat-edit-date"><Input id="muhurat-edit-date" type="date" value={muhurat.date} onChange={(event) => { const date = event.target.value; if (!date) return; const suggestion = findMuhuratSuggestion(date); updateMuhurat({ date, label: suggestion?.label ?? muhurat.label, source: suggestion?.source ?? "Entered by you", start: suggestion?.start ?? muhurat.start, end: suggestion?.end ?? muhurat.end }); }} /></Field>
          <Field label="Label" htmlFor="muhurat-edit-label"><Input id="muhurat-edit-label" value={muhurat.label} onChange={(event) => updateMuhurat({ label: event.target.value })} maxLength={100} /></Field>
          <Field label="Start" htmlFor="muhurat-edit-start"><Input id="muhurat-edit-start" type="time" value={muhurat.start} onChange={(event) => updateMuhurat({ start: event.target.value })} /></Field>
          <Field label="End" htmlFor="muhurat-edit-end"><Input id="muhurat-edit-end" type="time" value={muhurat.end} onChange={(event) => updateMuhurat({ end: event.target.value })} /></Field>
          <div className="sm:col-span-2"><Button variant="danger" size="sm" onClick={removeMuhurat}><Trash2 size={13} aria-hidden="true" /> Remove muhurat</Button></div>
        </div>}
        <p className="mt-4 text-[11px] leading-5 text-muted">{MUHURAT_CAVEAT}</p>
      </Card>

      <Card className="p-6">
        <Eyebrow>Budget split</Eyebrow>
        <h2 className="mt-2 font-display text-2xl font-medium">Give each function a target.</h2>
        <p className="mt-2 text-sm leading-6 text-muted">These are planning targets, not separate wallets. The master budget still reconciles to the rupee.</p>
        <div className="mt-4 space-y-3">
          {functions.map((item) => <div key={item.id}>
            <div className="flex justify-between gap-3 text-xs"><span className="truncate">{item.name}</span><span className="font-semibold">{formatMoney(item.budget)}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-clay" style={{ width: `${Math.min(100, item.budget / Math.max(1, plan.brief.budget) * 100)}%` }} /></div>
          </div>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted"><span>{formatMoney(totalTarget)} of {formatMoney(plan.brief.budget)} targeted</span><Button variant="secondary" size="sm" onClick={splitBudget}><Split size={13} aria-hidden="true" /> Split evenly by type</Button></div>
      </Card>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Eyebrow>The shape of the celebration</Eyebrow><h2 className="mt-1 font-display text-3xl font-medium">Functions</h2></div>
      <Button onClick={() => setDraft(makeDraft("mehndi", plan.brief))} aria-expanded={Boolean(draft)}><Plus size={16} aria-hidden="true" />{draft ? "Adding below" : "Add a function"}</Button>
    </div>

    {draft && <Card className="border-clay/25 p-6">
      <h3 className="font-display text-2xl font-medium">Add a function</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Type" htmlFor="fn-kind"><Select id="fn-kind" value={draft.kind} onChange={(event) => { const kind = event.target.value as FunctionKind; const meta = functionKindMeta(kind); setDraft((current) => current ? { ...current, kind, name: kind === "ceremony" ? getTradition(plan.brief.tradition).ceremonyLabel : functionKindLabel(kind), startTime: meta.start, endTime: meta.end, dressCode: meta.dress } : current); }}>{FUNCTION_KINDS.map((kind) => <option key={kind} value={kind}>{functionKindLabel(kind)}</option>)}</Select></Field>
        <Field label="Name" htmlFor="fn-name"><Input id="fn-name" value={draft.name} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} maxLength={80} /></Field>
        <Field label="Date" htmlFor="fn-date"><Input id="fn-date" type="date" value={draft.date} onChange={(event) => { if (event.target.value) setDraft((current) => current ? { ...current, date: event.target.value } : current); }} /></Field>
        <Field label="Guests" htmlFor="fn-guests"><Input id="fn-guests" type="number" min={1} max={100000} value={draft.guestCount} onChange={(event) => setDraft((current) => current ? { ...current, guestCount: Math.max(1, Number(event.target.value) || 1) } : current)} /></Field>
        <Field label="Start" htmlFor="fn-start"><Input id="fn-start" type="time" value={draft.startTime} onChange={(event) => setDraft((current) => current ? { ...current, startTime: event.target.value } : current)} /></Field>
        <Field label="End" htmlFor="fn-end"><Input id="fn-end" type="time" value={draft.endTime} onChange={(event) => setDraft((current) => current ? { ...current, endTime: event.target.value } : current)} /></Field>
        <Field label="Venue" htmlFor="fn-venue"><Input id="fn-venue" value={draft.venue} onChange={(event) => setDraft((current) => current ? { ...current, venue: event.target.value } : current)} maxLength={120} /></Field>
        <Field label="Dress code" htmlFor="fn-dress"><Input id="fn-dress" value={draft.dressCode} onChange={(event) => setDraft((current) => current ? { ...current, dressCode: event.target.value } : current)} maxLength={80} /></Field>
      </div>
      <div className="mt-4 flex gap-2"><Button onClick={addFunction}><Plus size={15} aria-hidden="true" /> Add function</Button><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button></div>
    </Card>}

    <section aria-label="Wedding functions" className="space-y-4">
      {functions.map((item) => <Card key={item.id} className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl font-medium">{item.name}</h3>{item.name !== functionKindLabel(item.kind) && <Badge>{functionKindLabel(item.kind)}</Badge>}{daysUntil(item.date) >= 0 && <Badge className="border-sage/20 bg-[#e8ede6] text-sage">{daysUntil(item.date)} days</Badge>}</div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"><span className="flex items-center gap-1"><CalendarDays size={12} />{formatDate(item.date)}</span><span className="flex items-center gap-1"><Clock3 size={12} />{item.startTime || "TBC"}–{item.endTime || "TBC"}</span><span className="flex items-center gap-1"><MapPin size={12} />{item.venue || "Venue TBC"}</span><span className="flex items-center gap-1"><Users size={12} />{item.guestCount} guests</span></p>
          </div>
          <Select value={item.status} onChange={(event) => updateFunction(item.id, { status: event.target.value as typeof item.status })} aria-label={`${item.name} status`} className="w-32 py-2 text-xs"><option value="planned">Planned</option><option value="booked">Booked</option><option value="done">Done</option></Select>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Date<Input type="date" value={item.date} onChange={(event) => { if (event.target.value) updateFunction(item.id, { date: event.target.value }); }} className="mt-1 py-2 text-xs" aria-label={`${item.name} date`} /></label>
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Start<Input type="time" value={item.startTime} onChange={(event) => updateFunction(item.id, { startTime: event.target.value })} className="mt-1 py-2 text-xs" aria-label={`${item.name} start time`} /></label>
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">End<Input type="time" value={item.endTime} onChange={(event) => updateFunction(item.id, { endTime: event.target.value })} className="mt-1 py-2 text-xs" aria-label={`${item.name} end time`} /></label>
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Guests<Input type="number" min={1} max={100000} value={item.guestCount} onChange={(event) => updateFunction(item.id, { guestCount: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 py-2 text-xs" aria-label={`${item.name} guests`} /></label>
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Venue<Input value={item.venue} onChange={(event) => updateFunction(item.id, { venue: event.target.value })} maxLength={120} className="mt-1 py-2 text-xs" aria-label={`${item.name} venue`} /></label>
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Dress code<Input value={item.dressCode} onChange={(event) => updateFunction(item.id, { dressCode: event.target.value })} maxLength={80} className="mt-1 py-2 text-xs" aria-label={`${item.name} dress code`} /></label>
          <label className="text-[10px] font-bold tracking-wider text-muted uppercase">Target budget<Input type="number" min={0} value={item.budget} onChange={(event) => updateFunction(item.id, { budget: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 py-2 text-xs" aria-label={`${item.name} target budget`} /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs text-muted"><span>{formatMoney(item.budget)} target · {Math.round(item.budget / Math.max(1, plan.brief.budget) * 100)}% of plan</span><Button variant="ghost" size="sm" onClick={() => removeFunction(item.id)} disabled={functions.length <= 1}><Trash2 size={13} aria-hidden="true" /> Remove</Button></div>
      </Card>)}
    </section>
  </div>;
}
