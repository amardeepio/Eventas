"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Archive, ArchiveRestore, Check, Copy, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { usePlan } from "@/lib/storage/plan-store";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface PlanSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanSwitcher({ open, onOpenChange }: PlanSwitcherProps) {
  const { plans, activePlanId, switchPlan, duplicatePlan, archivePlan, deletePlan } = usePlan();
  const active = plans.filter((plan) => !plan.archivedAt);
  const archived = plans.filter((plan) => plan.archivedAt);

  function choose(id: string) {
    switchPlan(id);
    onOpenChange(false);
  }

  function remove(id: string) {
    if (!window.confirm("Delete this plan permanently? Export a backup first if you might need it.")) return;
    deletePlan(id);
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-[28px] border border-line bg-paper p-6 shadow-[0_30px_80px_rgba(30,24,18,.28)] outline-none scrollbar-thin data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><Dialog.Title className="font-display text-2xl font-medium">Your plans</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-muted">Switch, duplicate, or archive a plan. Everything stays on this device.</Dialog.Description></div>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close plans"><X size={18} /></Button></Dialog.Close>
        </div>

        <div className="mt-6 space-y-2">
          {active.map((plan) => <article key={plan.id} className={cn("rounded-2xl border p-4", plan.id === activePlanId ? "border-sage/35 bg-[#e8ede6]/50" : "border-line bg-bone/40")}>
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => choose(plan.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold">{plan.brief.title}</p>
                <p className="mt-1 text-[11px] text-muted">{formatDate(plan.brief.date, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} · {plan.brief.guests} guests · {plan.guests.length} on the list</p>
              </button>
              {plan.id === activePlanId ? <Badge className="border-sage/20 bg-[#e8ede6] text-sage"><Check size={11} /> Open</Badge> : <Button size="sm" variant="secondary" onClick={() => choose(plan.id)}>Open</Button>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1"><Button variant="ghost" size="sm" onClick={() => duplicatePlan(plan.id)}><Copy size={13} /> Duplicate</Button><Button variant="ghost" size="sm" onClick={() => archivePlan(plan.id)}><Archive size={13} /> Archive</Button><Button variant="ghost" size="sm" onClick={() => remove(plan.id)}><Trash2 size={13} /> Delete</Button></div>
          </article>)}
          {active.length === 0 && <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">No active plans. Create one to get started.</p>}
        </div>

        {archived.length > 0 && <section className="mt-6"><h2 className="text-[10px] font-bold tracking-wider text-muted uppercase">Archived</h2><div className="mt-2 space-y-2">{archived.map((plan) => <div key={plan.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line/70 bg-soft/40 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-muted">{plan.brief.title}</p><p className="text-[10px] text-muted">{formatDate(plan.brief.date)} · archived</p></div><Button variant="ghost" size="sm" onClick={() => archivePlan(plan.id, false)}><ArchiveRestore size={13} /> Restore</Button><Button variant="ghost" size="icon" onClick={() => remove(plan.id)} aria-label={`Delete ${plan.brief.title}`}><Trash2 size={14} /></Button></div>)}</div></section>}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5"><Link href="/new" onClick={() => onOpenChange(false)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-clay px-5 text-sm font-semibold text-white"><Plus size={15} /> New event plan</Link><p className="self-center text-[11px] text-muted">Use Export → Full backup to move plans to another device.</p></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
