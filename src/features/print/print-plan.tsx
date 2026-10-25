"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/lib/storage/plan-store";
import { useLanguage } from "@/lib/i18n/language-provider";
import { getPack } from "@/lib/domain/packs";
import { getTradition } from "@/lib/domain/traditions";
import { getBudgetTotals } from "@/lib/domain/engine/budget";
import { auditPlan } from "@/lib/domain/engine/audit";
import { formatMuhuratTime } from "@/lib/domain/muhurat";
import { daysUntil, formatDate, formatMoney } from "@/lib/utils/format";

const VENDOR_STATUS: Record<string, string> = {
  idea: "Idea",
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  booked: "Booked",
};

const longDate = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } as const;

export function PrintPlan() {
  const { plan, hydrated } = usePlan();
  const { translating, language } = useLanguage();

  const sections = useMemo(() => {
    if (!plan) return null;
    const pack = getPack(plan.brief.eventType);
    const tradition = getTradition(plan.brief.tradition);
    const totals = getBudgetTotals(plan.budget);
    const audit = auditPlan(plan);
    const phases = plan.timeline.reduce<Record<string, typeof plan.timeline>>((groups, task) => {
      (groups[task.phase] ??= []).push(task);
      return groups;
    }, {});
    return { pack, tradition, totals, audit, phases };
  }, [plan]);

  // Set the document title so the browser suggests a useful PDF filename.
  useEffect(() => {
    if (!plan) return;
    const update = () => {
      document.title = `${plan.brief.title} — Eventas plan`;
    };
    update();
    window.addEventListener("beforeprint", update);
    return () => window.removeEventListener("beforeprint", update);
  }, [plan]);

  // Wait for fonts (including Indic fallbacks) and on-page translation before
  // opening the print dialog, so the saved PDF is complete on the first try.
  const auto = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("auto");
  useEffect(() => {
    if (!auto || !hydrated || !plan || translating) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (!cancelled) window.print();
      });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auto, hydrated, plan, translating, language]);

  if (!hydrated) {
    return (
      <main id="main-content" className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="text-sm text-muted">Preparing your PDF…</p>
      </main>
    );
  }

  if (!plan || !sections) {
    return (
      <main id="main-content" className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-3xl font-medium">No plan to export yet</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Create a brief first, then export it as a PDF from your planning studio.
          </p>
          <Link
            href="/new"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
          >
            Create a plan
          </Link>
        </div>
      </main>
    );
  }

  const { brief } = plan;
  const { pack, tradition, totals, audit, phases } = sections;
  const days = daysUntil(brief.date);
  const savedIdeas = plan.ideas.filter((idea) => idea.saved);
  const plannedShare = (value: number) => `${Math.round((value / Math.max(1, totals.planned)) * 100)}%`;

  return (
    <div className="print-page min-h-dvh bg-bone">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="text-xs text-muted">A4 · Print or save as PDF</p>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()}>
              <Printer size={15} aria-hidden="true" /> Save as PDF
            </Button>
            <Link
              href="/plan"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-muted transition hover:bg-soft hover:text-ink"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </Link>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-[860px] bg-white px-6 py-10 text-ink shadow-sm sm:px-12 sm:py-14 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b border-ink/15 pb-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.18em] text-clay uppercase">Eventas · {pack.label} plan</p>
              <h1 className="mt-3 font-display text-[34px] leading-[1.1] font-medium">{brief.title}</h1>
              <p className="mt-2 text-sm text-muted">
                {brief.guests} guests · {formatDate(brief.date, longDate)} · {brief.location}
              </p>
              <p className="mt-1 text-xs text-muted">
                {tradition.label}
                {brief.vibe ? ` · ${brief.vibe}` : ""}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Total budget</p>
              <p className="mt-1 font-display text-2xl font-medium">{formatMoney(brief.budget)}</p>
              <p className="mt-1 text-[11px] text-muted">{days > 0 ? `${days} days to go` : "Event day"}</p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl font-display text-xl leading-8 text-ink/85 italic">{plan.ai.headline}</p>
        </header>

        <section aria-label="Budget summary" className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Allocated", value: formatMoney(totals.planned) },
            { label: "Unallocated", value: formatMoney(Math.max(0, brief.budget - totals.planned)) },
            { label: "Actual spend", value: formatMoney(totals.actual) },
            { label: "Remaining", value: formatMoney(totals.remaining) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-ink/10 bg-bone/60 px-4 py-3 print-break-inside-avoid"
            >
              <p className="text-[9px] font-bold tracking-[0.14em] text-muted uppercase">{item.label}</p>
              <p className="mt-1 font-display text-lg font-medium">{item.value}</p>
            </div>
          ))}
        </section>

        {plan.muhurat && (
          <section className="print-break-inside-avoid mt-7 rounded-2xl border border-clay/25 bg-blush/50 px-5 py-4">
            <p className="text-[9px] font-bold tracking-[0.16em] text-clay uppercase">Muhurat</p>
            <p className="mt-1 font-display text-lg">
              {formatDate(plan.muhurat.date, longDate)} · {formatMuhuratTime(plan.muhurat)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {plan.muhurat.label} · {plan.muhurat.source}
            </p>
          </section>
        )}

        {plan.functions.length > 0 && (
          <section className="mt-9 print-break-inside-avoid">
            <SectionTitle>Functions</SectionTitle>
            <div className="scrollbar-thin -mx-1 overflow-x-auto px-1 print:overflow-visible">
              <table className="mt-3 w-full border-collapse text-left text-[12px]">
                <thead>
                  <tr className="border-b border-ink/15 text-[9px] tracking-[0.12em] text-muted uppercase">
                    <th className="py-2 pr-3 font-semibold">Function</th>
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Venue</th>
                    <th className="py-2 pr-3 text-right font-semibold">Guests</th>
                    <th className="py-2 text-right font-semibold">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.functions.map((item) => (
                    <tr key={item.id} className="border-b border-ink/8 align-top">
                      <td className="py-2 pr-3 font-semibold">{item.name}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDate(item.date)}
                        <span className="text-muted">{item.startTime ? ` · ${item.startTime}` : ""}</span>
                      </td>
                      <td className="py-2 pr-3">{item.venue || "TBC"}</td>
                      <td className="py-2 pr-3 text-right">{item.guestCount}</td>
                      <td className="py-2 text-right">{formatMoney(item.budget)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-9">
          <SectionTitle>Budget</SectionTitle>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-soft print-color">
            {plan.budget
              .filter((category) => category.planned > 0)
              .map((category) => (
                <span
                  key={category.id}
                  className="h-full print-color"
                  style={{ width: plannedShare(category.planned), backgroundColor: category.color }}
                />
              ))}
          </div>
          <div className="scrollbar-thin -mx-1 overflow-x-auto px-1 print:overflow-visible">
            <table className="mt-4 w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-ink/15 text-[9px] tracking-[0.12em] text-muted uppercase">
                  <th className="py-2 pr-3 font-semibold">Category</th>
                  <th className="py-2 pr-3 text-right font-semibold">Share</th>
                  <th className="py-2 pr-3 text-right font-semibold">Suggested</th>
                  <th className="py-2 pr-3 text-right font-semibold">Planned</th>
                  <th className="py-2 text-right font-semibold">Actual</th>
                </tr>
              </thead>
              <tbody>
                {plan.budget.map((category) => (
                  <tr key={category.id} className="border-b border-ink/8 align-top">
                    <td className={`py-2 pr-3 ${category.id === "contingency" ? "font-semibold" : ""}`}>
                      {category.name}
                    </td>
                    <td className="py-2 pr-3 text-right text-muted">{plannedShare(category.planned)}</td>
                    <td className="py-2 pr-3 text-right text-muted">{formatMoney(category.recommended)}</td>
                    <td className="py-2 pr-3 text-right font-medium">{formatMoney(category.planned)}</td>
                    <td
                      className={`py-2 text-right ${category.actual > category.planned ? "font-semibold text-red-700" : "text-muted"}`}
                    >
                      {formatMoney(category.actual)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink/20 text-[12px] font-semibold">
                  <td className="py-2.5 pr-3" colSpan={2}>
                    Total
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {formatMoney(plan.budget.reduce((sum, item) => sum + item.recommended, 0))}
                  </td>
                  <td className="py-2.5 pr-3 text-right">{formatMoney(totals.planned)}</td>
                  <td className="py-2.5 text-right">{formatMoney(totals.actual)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-muted">
            Vendor quotes may exclude GST and service charge. Estimates are planning guides, not quotes.
          </p>
        </section>

        <section className="mt-9 print-break-before">
          <SectionTitle>Timeline</SectionTitle>
          <div className="mt-4 space-y-5">
            {Object.entries(phases).map(([phase, tasks]) => (
              <div key={phase} className="print-break-inside-avoid">
                <h3 className="text-[10px] font-bold tracking-[0.14em] text-clay uppercase">{phase}</h3>
                <ul className="mt-2 space-y-2">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex gap-3 border-b border-ink/8 pb-2 text-[12px]">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-[3px] border ${task.status === "done" ? "border-sage bg-sage text-white" : "border-ink/30"}`}
                      >
                        {task.status === "done" ? "✓" : ""}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold ${task.status === "done" ? "text-muted line-through" : ""}`}>
                          {task.title}
                        </p>
                        <p className="mt-0.5 leading-5 text-muted">{task.description}</p>
                      </div>
                      <span className="shrink-0 text-[10px] whitespace-nowrap text-muted">
                        {formatDate(task.dueDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <SectionTitle>Vendor checklist</SectionTitle>
          <div className="mt-4 space-y-4">
            {plan.vendors.map((vendor) => (
              <div key={vendor.id} className="print-break-inside-avoid rounded-xl border border-ink/10 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] font-semibold">{vendor.category}</h3>
                  <p className="text-[10px] font-semibold tracking-wide text-clay uppercase">
                    {VENDOR_STATUS[vendor.status] ?? vendor.status}
                    {vendor.quote ? ` · ${formatMoney(vendor.quote)}` : ""}
                  </p>
                </div>
                <ul className="mt-2 grid gap-1 text-[11px] leading-5 text-muted sm:grid-cols-2 print:grid-cols-2">
                  {vendor.questions.map((question) => (
                    <li key={question} className="flex gap-1.5">
                      <span aria-hidden="true">–</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
                {vendor.notes && (
                  <p className="mt-2 border-t border-ink/8 pt-2 text-[11px] text-ink/80">Notes: {vendor.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {(audit.gaps.length > 0 || savedIdeas.length > 0) && (
          <section className="mt-9 print-break-inside-avoid">
            <SectionTitle>Still open &amp; saved ideas</SectionTitle>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <h3 className="text-[10px] font-bold tracking-[0.14em] text-clay uppercase">Before you book</h3>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5">
                  {audit.gaps.slice(0, 6).map((item) => (
                    <li key={item.title}>
                      <span className="font-semibold">{item.title}.</span>{" "}
                      <span className="text-muted">{item.detail}</span>
                    </li>
                  ))}
                  {audit.gaps.length === 0 && <li className="text-muted">The major pillars are covered.</li>}
                </ul>
              </div>
              <div>
                <h3 className="text-[10px] font-bold tracking-[0.14em] text-clay uppercase">Saved ideas</h3>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5">
                  {savedIdeas.map((idea) => (
                    <li key={idea.id}>
                      <span className="font-semibold">{idea.title}.</span>{" "}
                      <span className="text-muted">{idea.description}</span>
                    </li>
                  ))}
                  {savedIdeas.length === 0 && <li className="text-muted">No saved ideas yet.</li>}
                </ul>
              </div>
            </div>
          </section>
        )}

        {brief.notes && (
          <section className="mt-9 print-break-inside-avoid">
            <SectionTitle>Notes</SectionTitle>
            <p className="mt-2 text-[11px] leading-5 whitespace-pre-line text-muted">{brief.notes}</p>
          </section>
        )}

        <footer className="mt-10 border-t border-ink/15 pt-4 text-[9px] leading-4 text-muted">
          <p>Generated locally by Eventas · {formatDate(new Date().toISOString().slice(0, 10), longDate)}</p>
          <p className="mt-1">
            Vendor prices are planning estimates, not quotes. Confirm muhurat with your pandit and legal, tax, or permit
            details with the right authority.
          </p>
        </footer>
      </article>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[22px] font-medium tracking-[-.015em]">{children}</h2>;
}
