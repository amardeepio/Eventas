"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, MapPin, Send, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { DIETARY_OPTIONS, RSVP_LABELS } from "@/lib/domain/guests";
import type { RsvpStatus } from "@/lib/domain/types";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface SharedFunction { id: string; name: string; date: string; startTime: string; endTime: string; venue: string }
interface ResponseData {
  plan: { title: string; eventDate: string; hostName: string; functions: SharedFunction[]; expiresAt: string };
  guest: { id: string; name: string; functionIds: string[] };
  response: { invites: Array<{ functionId: string; status: string; seats: number }>; dietary: string[]; notes: string } | null;
}

export function RsvpForm({ token }: { token: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [invites, setInvites] = useState<Record<string, { status: RsvpStatus; seats: number }>>({});
  const [dietary, setDietary] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/rsvp/${token}`).then(async (response) => {
      const body = await response.json() as ResponseData & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "This RSVP link is not available.");
      if (cancelled) return;
      setData(body);
      const existing = new Map((body.response?.invites ?? []).map((invite) => [invite.functionId, invite]));
      setInvites(Object.fromEntries(body.guest.functionIds.map((id) => {
        const invite = existing.get(id);
        return [id, { status: (invite?.status as RsvpStatus) ?? "pending", seats: invite?.seats ?? 1 }];
      })));
      setDietary(body.response?.dietary ?? []);
      setNotes(body.response?.notes ?? "");
    }).catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load this invitation."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const invitedFunctions = useMemo(() => data?.plan.functions.filter((item) => data.guest.functionIds.includes(item.id)) ?? [], [data]);

  async function submit() {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: data.guest.functionIds.map((id) => ({ functionId: id, ...(invites[id] ?? { status: "pending", seats: 1 }) })),
          dietary,
          notes: notes.slice(0, 500),
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not send your RSVP.");
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send your RSVP.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main id="main-content" className="grid min-h-dvh place-items-center bg-bone px-6 text-center"><div><LoaderCircle className="mx-auto animate-spin text-clay" size={30} /><p className="mt-4 text-sm text-muted">Opening your invitation…</p></div></main>;

  if (!data) return <main id="main-content" className="grid min-h-dvh place-items-center bg-bone px-6 text-center"><div className="max-w-sm"><Logo className="mx-auto mb-8" /><WifiOff className="mx-auto text-clay" size={30} /><h1 className="mt-4 font-display text-4xl">This link isn’t active.</h1><p className="mt-3 text-sm leading-6 text-muted">{error || "Ask your host for a fresh RSVP link."}</p></div></main>;

  if (done) return <main id="main-content" className="grid min-h-dvh place-items-center bg-bone px-6 text-center"><div className="max-w-md"><span className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-white"><Check size={26} /></span><h1 className="mt-5 font-display text-4xl">Thank you, <span translate="no">{data.guest.name.split(" ")[0]}</span>.</h1><p className="mt-3 text-sm leading-6 text-muted">Your reply for <span translate="no">{data.plan.title}</span> is saved. You can reopen this link to change it.</p><Button variant="secondary" className="mt-6" onClick={() => setDone(false)}>Review my answer</Button></div></main>;

  return <main id="main-content" className="min-h-dvh bg-bone px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-2xl">
      <Logo />
      <Card className="mt-6 overflow-hidden">
        <div className="bg-ink p-6 text-white sm:p-8"><Eyebrow className="text-[#dfa990]">You’re invited</Eyebrow><h1 className="mt-3 font-display text-4xl leading-tight font-medium" translate="no">{data.plan.title}</h1><p className="mt-3 text-sm text-white/65">{[data.plan.hostName, formatDate(data.plan.eventDate, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })].filter(Boolean).join(" · ")}</p><p className="mt-2 text-xs text-white/50">RSVP for <span className="font-semibold text-white/80" translate="no">{data.guest.name}</span></p></div>
        <div className="space-y-6 p-5 sm:p-8">
          <section><div className="flex items-center gap-2"><Users size={16} className="text-clay" /><h2 className="font-display text-2xl font-medium">Which functions will you attend?</h2></div><div className="mt-3 space-y-2">{invitedFunctions.map((item) => { const value = invites[item.id] ?? { status: "pending" as RsvpStatus, seats: 1 }; return <div key={item.id} className="grid items-end gap-3 rounded-2xl border border-line bg-bone/40 p-4 sm:grid-cols-[1fr_170px_90px]"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-muted"><span>{formatDate(item.date)}</span>{item.startTime && <span>{item.startTime}–{item.endTime}</span>}{item.venue && <span className="inline-flex items-center gap-1"><MapPin size={11} />{item.venue}</span>}</p></div><label><span className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">Your reply</span><Select value={value.status} onChange={(event) => setInvites({ ...invites, [item.id]: { ...value, status: event.target.value as RsvpStatus } })} aria-label={`${item.name} RSVP`} className="py-2 text-xs">{Object.entries(RSVP_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select></label><label><span className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">Seats</span><Input type="number" min={0} max={20} value={value.seats} onChange={(event) => setInvites({ ...invites, [item.id]: { ...value, seats: Number(event.target.value) } })} aria-label={`${item.name} seats`} className="py-2 text-xs" /></label></div>; })}</div></section>
          <fieldset><legend className="text-sm font-semibold">Any dietary needs?</legend><div className="mt-2 flex flex-wrap gap-2">{DIETARY_OPTIONS.map((option) => { const selected = dietary.includes(option); return <button key={option} type="button" aria-pressed={selected} onClick={() => setDietary(selected ? dietary.filter((item) => item !== option) : [...dietary, option])} className={cn("min-h-9 rounded-full border px-3 text-xs font-medium", selected ? "border-sage bg-[#e8ede6] text-sage" : "border-line text-muted")}>{selected && <Check className="mr-1 inline" size={11} />}{option}</button>; })}</div></fieldset>
          <Field label="A note for the host (optional)" htmlFor="rsvp-notes"><Textarea id="rsvp-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Arrival time, accessibility, song request…" /></Field>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5"><Button onClick={submit} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{data.response ? "Update my RSVP" : "Send my RSVP"}</Button><Badge className="bg-bone font-normal">Only your name and reply are stored</Badge></div>
        </div>
      </Card>
      <p className="mt-5 text-center text-[11px] leading-5 text-muted">Your host created this invitation with Eventas. Contact them directly if the details look wrong.</p>
    </div>
  </main>;
}
