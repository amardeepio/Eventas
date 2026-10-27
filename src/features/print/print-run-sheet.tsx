"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/storage/plan-store";
import { formatDate, formatMoney } from "@/lib/utils/format";

const longDate = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } as const;

export function PrintRunSheet() {
  const { plan, hydrated } = usePlan();
  const auto = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("auto");

  const grouped = useMemo(() => {
    if (!plan) return [];
    return [...plan.functions]
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .map((functionItem) => ({
        functionItem,
        rows: plan.runSheet
          .filter((item) => item.functionId === functionItem.id)
          .sort((a, b) => `${a.startTime}${a.title}`.localeCompare(`${b.startTime}${b.title}`)),
      }));
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    document.title = `${plan.brief.title} — Run sheet`;
  }, [plan]);

  useEffect(() => {
    if (!auto || !hydrated || !plan) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [auto, hydrated, plan]);

  if (!hydrated) return <main id="main-content" className="grid min-h-dvh place-items-center"><p className="text-sm text-muted">Preparing the run sheet…</p></main>;
  if (!plan) return <main id="main-content" className="grid min-h-dvh place-items-center px-6 text-center"><div><h1 className="font-display text-3xl">No plan to export yet</h1><Link href="/new" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">Create a plan</Link></div></main>;

  const general = plan.runSheet.filter((item) => !item.functionId).sort((a, b) => `${a.startTime}${a.title}`.localeCompare(`${b.startTime}${b.title}`));

  return <div className="print-page min-h-dvh bg-bone">
    <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur"><div className="mx-auto flex max-w-[860px] items-center justify-between gap-3 px-5 py-3"><p className="text-xs text-muted">A4 · Print or save as PDF</p><div className="flex gap-2"><Button onClick={() => window.print()}><Printer size={15} /> Save as PDF</Button><Link href="/plan" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted"><ArrowLeft size={14} /> Back</Link></div></div></div>
    <article className="mx-auto max-w-[860px] bg-white px-6 py-10 text-ink shadow-sm sm:px-12 sm:py-14 print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="border-b border-ink/15 pb-6">
        <p className="text-[10px] font-bold tracking-[0.18em] text-clay uppercase">Eventas · Run sheet</p>
        <h1 className="mt-3 font-display text-[34px] leading-[1.1] font-medium">{plan.brief.title}</h1>
        <p className="mt-2 text-sm text-muted">{formatDate(plan.brief.date, longDate)} · {plan.brief.location} · {plan.brief.guests} guests</p>
        <p className="mt-1 text-xs text-muted">Budget {formatMoney(plan.brief.budget)} · {plan.guests.length} named guests · Printed from the local plan</p>
      </header>

      {grouped.map(({ functionItem, rows }) => <section key={functionItem.id} className="print-break-inside-avoid mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/15 pb-2"><h2 className="font-display text-xl font-medium">{functionItem.name}</h2><p className="text-[11px] text-muted">{formatDate(functionItem.date)} · {functionItem.startTime || "TBC"}–{functionItem.endTime || "TBC"} · {functionItem.venue || "Venue TBC"}</p></div>
        {rows.length > 0 ? <table className="mt-2 w-full border-collapse text-left text-[11px]"><thead><tr className="border-b border-ink/10 text-[9px] tracking-[0.12em] text-muted uppercase"><th className="py-1.5 pr-2 font-semibold">Time</th><th className="py-1.5 pr-2 font-semibold">Moment</th><th className="py-1.5 pr-2 font-semibold">Owner</th><th className="py-1.5 font-semibold">Notes</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b border-ink/8 align-top"><td className="py-2 pr-2 whitespace-nowrap font-medium">{item.startTime || "TBC"}{item.endTime ? `–${item.endTime}` : ""}</td><td className="py-2 pr-2 font-semibold">{item.title}<span className="block font-normal text-muted">{[item.location, item.contact].filter(Boolean).join(" · ")}</span></td><td className="py-2 pr-2">{item.owner || "—"}</td><td className="py-2 text-muted">{item.notes || "—"}</td></tr>)}</tbody></table> : <p className="mt-2 text-[11px] text-muted">No rows yet.</p>}
      </section>)}

      {general.length > 0 && <section className="print-break-inside-avoid mt-7"><h2 className="border-b border-ink/15 pb-2 font-display text-xl font-medium">Whole event</h2><table className="mt-2 w-full border-collapse text-left text-[11px]"><tbody>{general.map((item) => <tr key={item.id} className="border-b border-ink/8 align-top"><td className="py-2 pr-2 whitespace-nowrap font-medium">{item.startTime || "TBC"}</td><td className="py-2 pr-2 font-semibold">{item.title}</td><td className="py-2 pr-2">{item.owner || "—"}</td><td className="py-2 text-muted">{item.notes || "—"}</td></tr>)}</tbody></table></section>}

      <footer className="mt-10 border-t border-ink/15 pt-3 text-[10px] leading-5 text-muted">Keep one printed copy at the venue and share one with each family lead. Run sheet is a planning aid; confirm ritual timings with your pandit or officiant.</footer>
    </article>
  </div>;
}
