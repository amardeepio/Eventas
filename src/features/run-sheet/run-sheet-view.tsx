"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock3, Download, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { downloadRunSheetCsv } from "@/lib/utils/export-plan";
import { formatDate } from "@/lib/utils/format";
import type { RunSheetEntry } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

const EMPTY = {
  functionId: "",
  startTime: "10:00",
  endTime: "11:00",
  title: "",
  owner: "Host family",
  location: "",
  contact: "",
  notes: "",
};

type Draft = typeof EMPTY;

export function RunSheetView() {
  const { plan, updatePlan } = usePlan();
  const [functionFilter, setFunctionFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState("");
  if (!plan) return null;
  const activePlan = plan;

  const functions = [...plan.functions].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const visibleFunctions = functions.filter((item) => functionFilter === "all" || item.id === functionFilter);
  const generalRows = plan.runSheet.filter((item) => !item.functionId);

  function rowsFor(functionId: string) {
    return activePlan.runSheet
      .filter((item) => item.functionId === functionId)
      .sort((a, b) => `${a.startTime}${a.title}`.localeCompare(`${b.startTime}${b.title}`));
  }

  function startAdd(functionId = "") {
    const fn = functions.find((item) => item.id === functionId);
    setEditingId("new");
    setDraft({ ...EMPTY, functionId, startTime: fn?.startTime || "10:00", endTime: fn?.endTime || "11:00", location: fn?.venue || activePlan.brief.location });
    setError("");
  }

  function startEdit(item: RunSheetEntry) {
    setEditingId(item.id);
    setDraft({
      functionId: item.functionId ?? "",
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      owner: item.owner,
      location: item.location,
      contact: item.contact,
      notes: item.notes,
    });
    setError("");
  }

  function close() {
    setEditingId(null);
    setDraft(EMPTY);
    setError("");
  }

  function save() {
    if (!draft.title.trim()) { setError("Give this row a title."); return; }
    const values = {
      functionId: draft.functionId || undefined,
      startTime: draft.startTime,
      endTime: draft.endTime,
      title: draft.title.trim().slice(0, 160),
      owner: draft.owner.trim().slice(0, 80),
      location: draft.location.trim().slice(0, 120),
      contact: draft.contact.trim().slice(0, 120),
      notes: draft.notes.trim().slice(0, 1000),
    };
    updatePlan((current) => ({
      ...current,
      runSheet: editingId === "new"
        ? [...current.runSheet, { id: `run-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`, source: "custom" as const, ...values }]
        : current.runSheet.map((item) => item.id === editingId ? { ...item, ...values } : item),
    }));
    close();
  }

  function remove(item: RunSheetEntry) {
    if (!window.confirm(`Remove “${item.title}” from the run sheet?`)) return;
    updatePlan((current) => ({ ...current, runSheet: current.runSheet.filter((row) => row.id !== item.id) }));
    if (editingId === item.id) close();
  }

  function removeFunctionRows(functionId: string) {
    if (!window.confirm("Remove every run-sheet row for this function?")) return;
    updatePlan((current) => ({ ...current, runSheet: current.runSheet.filter((item) => item.functionId !== functionId) }));
  }

  const editor = editingId !== null && <Card className="animate-rise border-clay/25 p-6">
    <div className="flex items-start justify-between gap-4"><div><Eyebrow>{editingId === "new" ? "New run-sheet row" : "Edit run-sheet row"}</Eyebrow><h2 className="mt-1 font-display text-2xl font-medium">Who does what, and when?</h2></div><Button variant="ghost" size="icon" onClick={close} aria-label="Close run-sheet editor"><X size={18} /></Button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Function" htmlFor="run-function"><Select id="run-function" value={draft.functionId} onChange={(event) => setDraft({ ...draft, functionId: event.target.value })}><option value="">Whole event</option>{functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Title" htmlFor="run-title"><Input id="run-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={160} placeholder="Baraat arrives, lunch service…" /></Field>
      <Field label="Start" htmlFor="run-start"><Input id="run-start" type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field>
      <Field label="End" htmlFor="run-end"><Input id="run-end" type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></Field>
      <Field label="Owner" htmlFor="run-owner"><Input id="run-owner" value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} maxLength={80} /></Field>
      <Field label="Contact" htmlFor="run-contact"><Input id="run-contact" value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} maxLength={120} placeholder="Name and phone" /></Field>
      <div className="sm:col-span-2"><Field label="Location" htmlFor="run-location"><Input id="run-location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} maxLength={120} /></Field></div>
      <div className="sm:col-span-2"><Field label="Notes" htmlFor="run-notes"><Textarea id="run-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={1000} /></Field></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button onClick={save}><Check size={16} /> {editingId === "new" ? "Add row" : "Save row"}</Button><Button variant="ghost" onClick={close}>Cancel</Button></div>
  </Card>;

  function renderRow(item: RunSheetEntry) {
    return <article key={item.id} className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:px-6">
      <div className="w-24 shrink-0 text-xs font-semibold"><Clock3 className="mr-1 inline" size={12} />{item.startTime || "TBC"}<span className="block font-normal text-muted">{item.endTime || ""}</span></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold" translate="no">{item.title}</h3>{item.source === "custom" && <Badge className="bg-bone font-normal">Yours</Badge>}</div><p className="mt-1 text-[11px] text-muted">{[item.owner, item.location, item.contact].filter(Boolean).join(" · ") || "No owner yet"}</p>{item.notes && <p className="mt-1.5 text-xs leading-5 text-muted" translate="no">{item.notes}</p>}</div>
      <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`}><Pencil size={14} /></Button><Button variant="ghost" size="icon" onClick={() => remove(item)} aria-label={`Delete ${item.title}`}><Trash2 size={14} /></Button></div>
    </article>;
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Eyebrow>Day-of</Eyebrow><h2 className="mt-1 font-display text-3xl font-medium">The run sheet.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">One page for the people running the day: arrivals, rituals, meals, photos, and who owns each moment.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => startAdd(functionFilter === "all" ? "" : functionFilter)}><Plus size={15} /> Add row</Button><Button variant="ghost" onClick={() => downloadRunSheetCsv(plan)}><Download size={15} /> CSV</Button><Link href="/plan/run-sheet/print" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted hover:bg-soft hover:text-ink"><Printer size={15} /> Print</Link></div></div>

    <div className="flex flex-wrap items-center gap-3"><Select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)} aria-label="Filter run sheet by function" className="w-56 py-2 text-xs"><option value="all">All functions</option>{functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><p className="text-xs text-muted">{plan.runSheet.length} rows · {functions.length} functions</p></div>

    {editor}

    {plan.runSheet.length === 0 ? <Card className="p-10 text-center"><p className="font-display text-2xl">No rows yet.</p><p className="mt-2 text-sm text-muted">Add the first moment, or rebuild the plan to generate a starter run sheet.</p><Button className="mt-4" onClick={() => startAdd()}><Plus size={15} /> Add the first row</Button></Card>
      : <div className="space-y-6">
        {visibleFunctions.map((functionItem) => {
          const rows = rowsFor(functionItem.id);
          return <section key={functionItem.id} aria-labelledby={`run-${functionItem.id}`}>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><h2 id={`run-${functionItem.id}`} className="font-display text-2xl font-medium">{functionItem.name}</h2><p className="text-xs text-muted">{formatDate(functionItem.date)} · {functionItem.startTime || "TBC"}–{functionItem.endTime || "TBC"} · {functionItem.venue || "Venue TBC"}</p></div><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => startAdd(functionItem.id)}><Plus size={13} /> Row</Button>{rows.length > 0 && <Button variant="ghost" size="sm" onClick={() => removeFunctionRows(functionItem.id)}><Trash2 size={13} /> Clear</Button>}</div></div>
            <Card className={cn("overflow-hidden", rows.length === 0 && "border-dashed")}>{rows.length > 0 ? rows.map(renderRow) : <p className="p-5 text-sm text-muted">No rows for this function yet.</p>}</Card>
          </section>;
        })}
        {generalRows.length > 0 && <section aria-labelledby="run-general"><h2 id="run-general" className="mb-2 font-display text-2xl font-medium">Whole event</h2><Card className="overflow-hidden">{generalRows.sort((a, b) => `${a.startTime}${a.title}`.localeCompare(`${b.startTime}${b.title}`)).map(renderRow)}</Card></section>}
      </div>}
  </div>;
}
