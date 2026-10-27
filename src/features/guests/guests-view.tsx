"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Download, Pencil, Plus, Search, Trash2, Upload, Users, X } from "lucide-react";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { usePlan } from "@/lib/storage/plan-store";
import { DIETARY_OPTIONS, getGuestSummary, makeGuest, RSVP_LABELS } from "@/lib/domain/guests";
import { downloadGuestCsv } from "@/lib/utils/export-plan";
import { RsvpManager } from "../rsvp/rsvp-manager";
import { guestsFromCsv } from "@/lib/utils/csv";
import type { Guest, HostSide, RsvpStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

const EMPTY_FILTER = "all";

export function GuestsView() {
  const { plan, updatePlan } = usePlan();
  const [search, setSearch] = useState("");
  const [functionFilter, setFunctionFilter] = useState(EMPTY_FILTER);
  const [statusFilter, setStatusFilter] = useState(EMPTY_FILTER);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Guest | null>(null);
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => plan ? getGuestSummary(plan) : null, [plan]);
  if (!plan || !summary) return null;
  const activePlan = plan;

  const visible = plan.guests.filter((guest) => {
    if (search.trim() && !`${guest.name} ${guest.relationship} ${guest.city} ${guest.phone}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (functionFilter !== EMPTY_FILTER && !guest.invites.some((invite) => invite.functionId === functionFilter)) return false;
    if (statusFilter !== EMPTY_FILTER && !guest.invites.some((invite) => invite.status === statusFilter)) return false;
    return true;
  });

  function startAdd() {
    const guest = makeGuest("", activePlan.functions.map((item) => item.id));
    setDraft({ ...guest, name: "" });
    setEditingId("new");
    setError("");
  }

  function startEdit(guest: Guest) {
    setDraft(structuredClone(guest));
    setEditingId(guest.id);
    setError("");
  }

  function close() {
    setEditingId(null);
    setDraft(null);
    setError("");
  }

  function save() {
    if (!draft || draft.name.trim().length < 1) { setError("Add the guest’s name."); return; }
    const clean: Guest = {
      ...draft,
      name: draft.name.trim().slice(0, 100),
      invites: draft.invites.map((invite) => ({ ...invite, seats: Math.max(0, Math.min(50, Math.round(invite.seats || 0))) })),
      dietary: draft.dietary.slice(0, 10),
    };
    updatePlan((current) => ({
      ...current,
      guests: editingId === "new"
        ? [...current.guests, clean]
        : current.guests.map((guest) => guest.id === editingId ? clean : guest),
    }));
    close();
  }

  function remove(guest: Guest) {
    if (!window.confirm(`Remove ${guest.name} from the guest list?`)) return;
    updatePlan((current) => ({ ...current, guests: current.guests.filter((item) => item.id !== guest.id) }));
    if (editingId === guest.id) close();
  }

  function updateInvite(functionId: string, patch: Partial<Guest["invites"][number]>) {
    if (!draft) return;
    setDraft({
      ...draft,
      invites: draft.invites.map((invite) => invite.functionId === functionId ? { ...invite, ...patch } : invite),
    });
  }

  async function importCsv(file: File | undefined) {
    setImportMessage("");
    setError("");
    if (!file) return;
    try {
      const { guests, skipped } = guestsFromCsv(activePlan, await file.text());
      if (guests.length === 0) throw new Error("No guest rows found. Check that the first column is Name.");
      updatePlan((current) => ({ ...current, guests: [...current.guests, ...guests].slice(0, 2000) }));
      setImportMessage(`Added ${guests.length} guest${guests.length === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that CSV.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const editor = draft && editingId !== null && <Card className="animate-rise border-clay/25 p-6">
    <div className="flex items-start justify-between gap-4"><div><Eyebrow>{editingId === "new" ? "New guest" : "Guest details"}</Eyebrow><h2 className="mt-1 font-display text-2xl font-medium">{editingId === "new" ? "Add someone to the list." : "Keep the details current."}</h2></div><Button variant="ghost" size="icon" onClick={close} aria-label="Close guest editor"><X size={18} /></Button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="guest-name"><Input id="guest-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={100} /></Field>
      <Field label="Side" htmlFor="guest-side"><Select id="guest-side" value={draft.side} onChange={(event) => setDraft({ ...draft, side: event.target.value as HostSide })}><option value="both">Both / family friend</option><option value="bride">Bride’s side</option><option value="groom">Groom’s side</option></Select></Field>
      <Field label="Relationship" htmlFor="guest-relationship"><Input id="guest-relationship" value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value })} maxLength={80} placeholder="Aunt, college friend, colleague…" /></Field>
      <Field label="City" htmlFor="guest-city"><Input id="guest-city" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} maxLength={80} /></Field>
      <Field label="Phone" htmlFor="guest-phone"><Input id="guest-phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} maxLength={40} inputMode="tel" /></Field>
      <Field label="Email" htmlFor="guest-email"><Input id="guest-email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} maxLength={160} /></Field>
      <div className="sm:col-span-2"><fieldset><legend className="mb-2 text-sm font-semibold">Dietary needs</legend><div className="flex flex-wrap gap-2">{DIETARY_OPTIONS.map((option) => { const selected = draft.dietary.includes(option); return <button key={option} type="button" aria-pressed={selected} onClick={() => setDraft({ ...draft, dietary: selected ? draft.dietary.filter((item) => item !== option) : [...draft.dietary, option] })} className={cn("min-h-9 rounded-full border px-3 text-xs font-medium", selected ? "border-sage bg-[#e8ede6] text-sage" : "border-line bg-paper text-muted")}>{selected && <Check className="mr-1 inline" size={11} />}{option}</button>; })}</div></fieldset></div>
      <div className="sm:col-span-2"><fieldset><legend className="mb-2 text-sm font-semibold">Invitations & RSVP</legend><div className="space-y-2">{plan.functions.map((item) => { const invite = draft.invites.find((row) => row.functionId === item.id) ?? { functionId: item.id, status: "pending" as RsvpStatus, seats: 1 }; return <div key={item.id} className="grid items-end gap-2 rounded-2xl border border-line bg-bone/40 p-3 sm:grid-cols-[1fr_170px_90px]"><div><p className="text-sm font-medium">{item.name}</p><p className="text-[11px] text-muted">{item.date}</p></div><label><span className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">RSVP</span><Select value={invite.status} onChange={(event) => updateInvite(item.id, { status: event.target.value as RsvpStatus })} aria-label={`${item.name} RSVP for ${draft.name || "guest"}`} className="py-2 text-xs">{Object.entries(RSVP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label><label><span className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">Seats</span><Input type="number" min={0} max={50} value={invite.seats} onChange={(event) => updateInvite(item.id, { seats: Number(event.target.value) })} aria-label={`${item.name} seats for ${draft.name || "guest"}`} className="py-2 text-xs" /></label></div>; })}</div></fieldset></div>
      <Field label="Arriving" htmlFor="guest-arriving"><Input id="guest-arriving" type="date" value={draft.travel.arriving} onChange={(event) => setDraft({ ...draft, travel: { ...draft.travel, arriving: event.target.value } })} /></Field>
      <Field label="Departing" htmlFor="guest-departing"><Input id="guest-departing" type="date" value={draft.travel.departing} onChange={(event) => setDraft({ ...draft, travel: { ...draft.travel, departing: event.target.value } })} /></Field>
      <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={draft.travel.needsPickup} onClick={() => setDraft({ ...draft, travel: { ...draft.travel, needsPickup: !draft.travel.needsPickup } })} className={cn("min-h-10 rounded-full border px-3 text-xs font-medium", draft.travel.needsPickup ? "border-sage bg-[#e8ede6] text-sage" : "border-line text-muted")}>Airport pickup</button><button type="button" aria-pressed={draft.travel.needsHotel} onClick={() => setDraft({ ...draft, travel: { ...draft.travel, needsHotel: !draft.travel.needsHotel } })} className={cn("min-h-10 rounded-full border px-3 text-xs font-medium", draft.travel.needsHotel ? "border-sage bg-[#e8ede6] text-sage" : "border-line text-muted")}>Hotel needed</button></div>
      <Field label="Room preference" htmlFor="guest-room"><Input id="guest-room" value={draft.travel.roomPreference} onChange={(event) => setDraft({ ...draft, travel: { ...draft.travel, roomPreference: event.target.value } })} maxLength={80} placeholder="Double, twin, accessible…" /></Field>
      <div className="sm:col-span-2"><Field label="Notes" htmlFor="guest-notes"><Textarea id="guest-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} maxLength={1000} placeholder="Anything the family should remember." /></Field></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button onClick={save}><Check size={16} /> {editingId === "new" ? "Add guest" : "Save guest"}</Button><Button variant="ghost" onClick={close}>Cancel</Button></div>
  </Card>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><Eyebrow>The people</Eyebrow><h2 className="mt-1 font-display text-3xl font-medium">Who is coming, and to what?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Keep one list, invite people per function, and see the real plate count. Guest names and details never leave this device.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={startAdd}><Plus size={15} /> Add guest</Button><Button variant="ghost" onClick={() => downloadGuestCsv(plan)}><Download size={15} /> Export CSV</Button><Button variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import CSV</Button><input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="Import guest CSV" className="sr-only" onChange={(event) => void importCsv(event.target.files?.[0])} /></div>
    </div>

    <RsvpManager />

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "On the list", value: `${summary.total}`, detail: "named guests" },
        { label: "Attending", value: `${summary.yes}`, detail: `${summary.confirmedSeats} confirmed seats` },
        { label: "Awaiting reply", value: `${summary.pending}`, detail: "needs a nudge" },
        { label: "Declined", value: `${summary.no}`, detail: "counted separately" },
      ].map((item) => <Card key={item.label} className="p-5"><Users size={18} className="text-clay" aria-hidden="true" /><p className="mt-3 font-display text-3xl font-medium">{item.value}</p><p className="mt-1 text-xs font-semibold">{item.label} <span className="font-normal text-muted">· {item.detail}</span></p></Card>)}
    </section>

    {Object.keys(summary.dietary).length > 0 && <Card className="p-4"><p className="text-xs font-semibold">Dietary summary</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(summary.dietary).sort((a, b) => b[1] - a[1]).map(([label, count]) => <Badge key={label} className="bg-bone font-normal">{label} · {count}</Badge>)}</div></Card>}

    {editor}

    {importMessage && <p role="status" className="rounded-2xl border border-sage/25 bg-[#e8ede6]/60 p-3 text-sm text-sage">{importMessage}</p>}
    {error && !draft && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <Card className="overflow-hidden">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_190px_190px] sm:items-end">
        <label className="relative block"><span className="sr-only">Search guests</span><Search size={15} className="absolute top-3 left-3 text-muted" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, city, phone…" className="pl-9" /></label>
        <label><span className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">Function</span><Select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)}><option value="all">All functions</option>{plan.functions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <label><span className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">RSVP</span><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Any status</option>{Object.entries(RSVP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
      </div>

      {visible.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto text-muted" size={30} /><h3 className="mt-3 font-display text-2xl">{plan.guests.length === 0 ? "No guests yet." : "No guests match."}</h3><p className="mt-2 text-sm text-muted">{plan.guests.length === 0 ? "Add the first name, or import a CSV from your family spreadsheet." : "Try clearing the search or filters."}</p></div>
        : <ul className="divide-y divide-line">{visible.map((guest) => <li key={guest.id} className="flex flex-wrap items-start gap-3 p-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold" translate="no">{guest.name}</h3><Badge className="bg-bone font-normal">{guest.side === "both" ? "Both sides" : `${guest.side === "bride" ? "Bride" : "Groom"}'s side`}</Badge>{guest.dietary.slice(0, 2).map((item) => <Badge key={item} className="bg-bone font-normal">{item}</Badge>)}</div>
            <p className="mt-1 text-[11px] text-muted">{[guest.relationship, guest.city, guest.phone].filter(Boolean).join(" · ") || "No contact details yet"}</p>
            <div className="mt-2 flex flex-wrap gap-2">{guest.invites.map((invite) => { const functionItem = plan.functions.find((item) => item.id === invite.functionId); if (!functionItem) return null; return <span key={invite.functionId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium", invite.status === "yes" ? "border-sage/25 bg-[#e8ede6] text-sage" : invite.status === "no" ? "border-red-200 bg-red-50 text-red-700" : "border-line text-muted")}>{functionItem.name}: {RSVP_LABELS[invite.status]}{invite.status === "yes" ? ` · ${invite.seats}` : ""}</span>; })}</div>
          </div>
          <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => startEdit(guest)} aria-label={`Edit ${guest.name}`}><Pencil size={15} /></Button><Button variant="ghost" size="icon" onClick={() => remove(guest)} aria-label={`Remove ${guest.name}`}><Trash2 size={15} /></Button></div>
        </li>)}</ul>}
    </Card>
  </div>;
}
