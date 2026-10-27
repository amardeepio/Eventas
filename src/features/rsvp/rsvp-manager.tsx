"use client";

import { useState } from "react";
import { Check, Clipboard, CloudUpload, LoaderCircle, RefreshCw, ShieldCheck, Square, Users } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/storage/plan-store";
import { addDays, parseISODate, toISODate } from "@/lib/utils/format";
import type { RsvpStatus } from "@/lib/domain/types";

interface GuestLink { guestId: string; name: string; url: string }
interface ResponseRow { guestId: string; guestName: string; invites: Array<{ functionId: string; status: string; seats: number }>; dietary: string[]; notes: string; updatedAt: string }

export function RsvpManager() {
  const { plan, updatePlan } = usePlan();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [copied, setCopied] = useState("");
  if (!plan) return null;
  const activePlan = plan;

  async function call(path: string, body: unknown, method = "POST") {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json", ...(activePlan.rsvpShare ? { "x-eventas-host-key": activePlan.rsvpShare.hostKey } : {}) }, ...(method === "GET" ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "The RSVP service did not respond.");
    return data;
  }

  async function publish() {
    if (!plan) return;
    if (activePlan.guests.length === 0) { setError("Add at least one guest before publishing."); return; }
    setBusy("publish"); setError(""); setStatus("");
    try {
      const expiresAt = toISODate(addDays(parseISODate(activePlan.brief.date), 30));
      const data = await call("/api/rsvp/publish", {
        planId: activePlan.id,
        title: activePlan.brief.title,
        hostName: activePlan.brief.hostNames,
        eventDate: activePlan.brief.date,
        functions: activePlan.functions.map((item) => ({ id: item.id, name: item.name, date: item.date, startTime: item.startTime, endTime: item.endTime, venue: item.venue })),
        guests: activePlan.guests.map((guest) => ({ id: guest.id, name: guest.name, functionIds: guest.invites.map((invite) => invite.functionId) })),
        expiresAt,
        ...(activePlan.rsvpShare ? { hostKey: activePlan.rsvpShare.hostKey } : {}),
      }) as { hostKey: string; expiresAt: string };
      updatePlan((current) => ({ ...current, rsvpShare: { hostKey: data.hostKey, publishedAt: new Date().toISOString(), expiresAt: data.expiresAt } }));
      setStatus(`Published ${activePlan.guests.length} guest link${activePlan.guests.length === 1 ? "" : "s"}.`);
      const linkData = await call("/api/rsvp/links", { planId: activePlan.id, hostKey: data.hostKey }) as { links: GuestLink[] };
      setLinks(linkData.links);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish the guest list.");
    } finally { setBusy(""); }
  }

  async function loadLinks() {
    if (!activePlan.rsvpShare) return;
    setBusy("links"); setError("");
    try {
      const data = await call("/api/rsvp/links", { planId: activePlan.id, hostKey: activePlan.rsvpShare.hostKey }) as { links: GuestLink[] };
      setLinks(data.links);
      setStatus(`${data.links.length} links ready.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create links."); }
    finally { setBusy(""); }
  }

  async function loadResponses() {
    if (!activePlan.rsvpShare) return;
    setBusy("responses"); setError("");
    try {
      const response = await fetch(`/api/rsvp/manage?planId=${encodeURIComponent(activePlan.id)}`, { headers: { "x-eventas-host-key": activePlan.rsvpShare.hostKey } });
      const data = await response.json() as { error?: string; responses?: ResponseRow[] };
      if (!response.ok) throw new Error(data.error ?? "Could not load responses.");
      setResponses(data.responses ?? []);
      setStatus(`${data.responses?.length ?? 0} response${data.responses?.length === 1 ? "" : "s"} loaded.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load responses."); }
    finally { setBusy(""); }
  }

  async function copyLinks() {
    try {
      await navigator.clipboard.writeText(links.map((link) => `${link.name}: ${link.url}`).join("\n"));
      setCopied("all"); window.setTimeout(() => setCopied(""), 2000);
    } catch { setError("Your browser blocked the clipboard. Open a link and copy it manually."); }
  }

  async function revoke() {
    if (!activePlan.rsvpShare) return;
    if (!window.confirm("Stop collecting RSVPs? Existing links will stop working.")) return;
    setBusy("revoke"); setError("");
    try {
      await call("/api/rsvp/revoke", { planId: activePlan.id, hostKey: activePlan.rsvpShare.hostKey });
      updatePlan((current) => ({ ...current, rsvpShare: null }));
      setLinks([]); setResponses([]); setStatus("RSVP collection stopped.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not stop collection."); }
    finally { setBusy(""); }
  }

  function applyResponses() {
    if (responses.length === 0) return;
    updatePlan((current) => ({
      ...current,
      guests: current.guests.map((guest) => {
        const response = responses.find((item) => item.guestId === guest.id);
        if (!response) return guest;
        return {
          ...guest,
          dietary: response.dietary.slice(0, 10),
          notes: response.notes.slice(0, 1000),
          invites: guest.invites.map((invite) => {
            const reply = response.invites.find((item) => item.functionId === invite.functionId);
            return reply ? { ...invite, status: reply.status as RsvpStatus, seats: Math.max(0, Math.min(50, reply.seats)) } : invite;
          }),
        };
      }),
    }));
    setStatus(`Applied ${responses.length} response${responses.length === 1 ? "" : "s"} to the guest list.`);
  }

  return <Card className="border-sage/25 bg-[#e8ede6]/30 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-sage"><ShieldCheck size={20} /></span><div><Eyebrow>Hosted RSVP</Eyebrow><h2 className="mt-1 font-display text-2xl font-medium">{plan.rsvpShare ? "Collecting replies." : "Send one link per guest."}</h2><p className="mt-1 max-w-xl text-xs leading-5 text-muted">Only names, function invitations, and replies are stored. Phone, email, travel, and notes stay on this device. Replies are saved in Firestore so guests can answer from their own phone.</p></div></div>
      <div className="flex flex-wrap gap-2">{!plan.rsvpShare ? <Button onClick={publish} disabled={busy === "publish"}>{busy === "publish" ? <LoaderCircle className="animate-spin" size={15} /> : <CloudUpload size={15} />}Publish guest links</Button> : <><Button variant="secondary" onClick={loadResponses} disabled={busy === "responses"}>{busy === "responses" ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />}Refresh replies</Button><Button variant="ghost" onClick={loadLinks} disabled={busy === "links"}><Users size={15} />Get links</Button><Button variant="ghost" onClick={revoke} disabled={busy === "revoke"}><Square size={13} />Stop</Button></>}</div>
    </div>

    {plan.rsvpShare && <p className="mt-3 text-[11px] text-muted">Published {plan.rsvpShare.publishedAt.slice(0, 10)} · links expire {plan.rsvpShare.expiresAt} · {plan.guests.length} guests. Republishing updates names and functions.</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {status && <p role="status" className="mt-3 text-xs font-medium text-sage">{status}</p>}

    {links.length > 0 && <div className="mt-4"><div className="flex flex-wrap items-center gap-2"><Button size="sm" onClick={copyLinks}>{copied === "all" ? <Check size={14} /> : <Clipboard size={14} />}{copied === "all" ? "Copied all" : "Copy all links"}</Button><span className="text-[11px] text-muted">{links.length} guest links</span></div><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-muted">Preview links</summary><ul className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1 text-[11px]">{links.slice(0, 200).map((link) => <li key={link.guestId} className="flex gap-2"><span className="w-32 shrink-0 truncate font-medium" translate="no">{link.name}</span><span className="min-w-0 flex-1 truncate text-muted">{link.url}</span></li>)}</ul>{links.length > 200 && <p className="mt-1 text-[10px] text-muted">Showing the first 200. Copy all to get every link.</p>}</details></div>}

    {responses.length > 0 && <div className="mt-4 rounded-2xl border border-line bg-white/70 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">{responses.length} replies loaded</p><Button size="sm" onClick={applyResponses}><Check size={14} /> Apply to guest list</Button></div><ul className="mt-2 divide-y divide-line">{responses.slice(0, 8).map((response) => <li key={response.guestId} className="py-2 text-[11px]"><span className="font-semibold" translate="no">{response.guestName}</span><span className="text-muted"> · {response.invites.map((invite) => `${invite.status}${invite.status === "yes" ? ` (${invite.seats})` : ""}`).join(", ")}{response.dietary.length ? ` · ${response.dietary.join(", ")}` : ""}{response.notes ? ` · ${response.notes}` : ""}</span></li>)}</ul>{responses.length > 8 && <p className="mt-1 text-[10px] text-muted">Showing the latest 8; applying uses all replies.</p>}</div>}
  </Card>;
}
