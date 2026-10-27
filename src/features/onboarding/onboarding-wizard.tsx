"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Heart, LoaderCircle, MapPin, PartyPopper, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { CityCombobox } from "@/components/ui/city-combobox";
import { Logo } from "@/components/ui/logo";
import { EVENT_TYPES, type Brief, type EventType, type FunctionDraft, type FunctionKind } from "@/lib/domain/types";
import { getPack, getSampleBrief } from "@/lib/domain/packs";
import { defaultFunctionDrafts, functionKindLabel, functionKindMeta } from "@/lib/domain/functions";
import { TRADITION_OPTIONS } from "@/lib/domain/traditions";
import { CONSTRAINT_OPTIONS } from "@/lib/domain/constraints";
import { allocateBudget } from "@/lib/domain/engine/budget";
import { cityTierLabel, inferCostLevel } from "@/lib/domain/city-tiers";
import { findMuhuratSuggestion, MUHURAT_CAVEAT } from "@/lib/domain/muhurat";
import { briefSchema } from "@/lib/validation/schemas";
import { usePlan } from "@/lib/storage/plan-store";
import { addDays, daysUntil, formatDate, formatMoney, toISODate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { AiBuilder } from "./ai-builder";

const steps = ["Event", "Basics", "Budget", "Priorities", "Personality"];
const icons = { wedding: Heart, birthday: PartyPopper, community: Users } as const;
const functionChoices: FunctionKind[] = ["haldi", "mehndi", "sangeet", "baraat", "ceremony", "reception", "vidaai"];

function initialBrief(type: EventType = "wedding"): Brief {
  const pack = getPack(type);
  return {
    eventType: type, title: type === "wedding" ? "Our wedding" : `Our ${pack.label.toLowerCase()}`,
    hostNames: "", date: toISODate(addDays(new Date(), pack.horizonMonths * 30)),
    guests: pack.defaultGuests, budget: pack.defaultBudget, location: "New Delhi, Delhi", costLevel: "average",
    priorities: pack.priorities.slice(0, 3).map((priority) => priority.id), vibe: pack.vibes[0]?.id ?? "modern",
    notes: "", constraints: [],
    tradition: type === "wedding" ? pack.defaultTradition : "none",
    functions: [],
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { plan, createPlan, updateBrief, enrichWithAi } = usePlan();
  const isEdit = params.get("edit") === "1" && Boolean(plan);
  const requestedType = params.get("type");
  const validType = EVENT_TYPES.includes(requestedType as EventType) ? requestedType as EventType : "wedding";
  const [brief, setBrief] = useState<Brief>(() => initialBrief(validType));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const sampleStarted = useRef(false);
  const interactedRef = useRef(false);
  const editLoadedRef = useRef(false);
  const pack = getPack(brief.eventType);

  useEffect(() => {
    const sample = params.get("sample");
    if (!sample) {
      // Same-route query changes preserve component state; clear the sample loader.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreating(false);
    }
    if (sample && EVENT_TYPES.includes(sample as EventType) && !sampleStarted.current) {
      sampleStarted.current = true;
      const created = createPlan(getSampleBrief(sample as EventType));
      // Sample deep links intentionally create and route once after mount.
       
      setCreating(true);
      void enrichWithAi(created);
      router.replace("/plan");
      return;
    }
    if (plan && params.get("edit") === "1" && !interactedRef.current && !editLoadedRef.current) {
      editLoadedRef.current = true;
      setBrief(plan.brief);
      setDraftLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem("eventas.draft.v2");
      if (raw && !params.get("type") && !interactedRef.current) {
        const result = briefSchema.partial().safeParse(JSON.parse(raw));
        if (result.success) setBrief((current) => ({ ...current, ...result.data }));
      }
    } catch { localStorage.removeItem("eventas.draft.v2"); }
     
    setDraftLoaded(true);
  }, [params, plan, createPlan, enrichWithAi, router]);

  useEffect(() => {
    if (draftLoaded && !creating) localStorage.setItem("eventas.draft.v2", JSON.stringify(brief));
  }, [brief, draftLoaded, creating]);

  const preview = useMemo(() => allocateBudget(pack, brief).sort((a, b) => b.recommended - a.recommended).slice(0, 4), [pack, brief]);
  const days = daysUntil(brief.date);

  function update<K extends keyof Brief>(key: K, value: Brief[K]) {
    interactedRef.current = true;
    setBrief((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  }

  function chooseType(type: EventType) {
    interactedRef.current = true;
    const next = getPack(type);
    setBrief((current) => ({ ...current, eventType: type, guests: next.defaultGuests, budget: next.defaultBudget, priorities: next.priorities.slice(0, 3).map((item) => item.id), vibe: next.vibes[0]?.id ?? "", title: type === "wedding" ? "Our wedding" : `Our ${next.label.toLowerCase()}`, tradition: type === "wedding" ? next.defaultTradition : "none", functions: [] }));
  }

  const selectedFunctions = brief.eventType === "wedding"
    ? (brief.functions.length ? brief.functions : defaultFunctionDrafts(brief))
    : [];

  function toggleFunction(kind: FunctionKind) {
    const current = brief.functions.length ? brief.functions : defaultFunctionDrafts(brief);
    const exists = current.some((item) => item.kind === kind);
    if (exists) {
      const next = current.filter((item) => item.kind !== kind);
      update("functions", next.length ? next : current.filter((item) => item.kind === kind));
      return;
    }
    const draft = defaultFunctionDrafts(brief).find((item) => item.kind === kind) ?? makeFunction(kind);
    update("functions", [...current, draft]);
  }

  function makeFunction(kind: FunctionKind): FunctionDraft {
    const meta = functionKindMeta(kind);
    return {
      kind,
      name: functionKindLabel(kind),
      date: brief.date,
      startTime: meta.start,
      endTime: meta.end,
      venue: brief.location,
      guestCount: brief.guests,
      dressCode: meta.dress,
      hostSide: "both",
    };
  }

  function updateFunction(kind: FunctionKind, patch: Partial<FunctionDraft>) {
    const current = brief.functions.length ? brief.functions : defaultFunctionDrafts(brief);
    update("functions", current.map((item) => item.kind === kind ? { ...item, ...patch } : item));
  }

  function updateMuhurat(patch: Partial<NonNullable<Brief["muhurat"]>>) {
    const current = brief.muhurat;
    if (!current) return;
    update("muhurat", { ...current, ...patch });
  }

  function validate(targetStep: number): boolean {
    if (targetStep === 0) { setErrors({}); return true; }
    let result;
    if (targetStep === 1) result = briefSchema.pick({ title: true, hostNames: true, date: true, guests: true }).safeParse(brief);
    else if (targetStep === 2) result = briefSchema.pick({ budget: true, location: true, costLevel: true }).safeParse(brief);
    else if (targetStep === 3) result = briefSchema.pick({ priorities: true }).safeParse(brief);
    else if (targetStep === 4) result = briefSchema.pick({ vibe: true, notes: true, constraints: true }).safeParse(brief);
    else result = briefSchema.safeParse(brief);
    const nextErrors: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) nextErrors[String(issue.path[0])] = issue.message;
    }
    if (targetStep === 1 && daysUntil(brief.date) < 1) nextErrors.date = "Choose a date in the future";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) requestAnimationFrame(() => errorRef.current?.focus());
    return Object.keys(nextErrors).length === 0;
  }

  function next() { if (validate(step)) { setStep((current) => Math.min(4, current + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); } }
  function submit() {
    if (!validate(4)) return;
    setCreating(true);
    const saved = isEdit ? updateBrief(brief) : createPlan(brief);
    localStorage.removeItem("eventas.draft.v2");
    if (saved) void enrichWithAi(saved);
    router.push("/plan");
  }

  if (creating) return <main id="main-content" className="grid min-h-dvh place-content-center px-6 text-center"><LoaderCircle className="mx-auto animate-spin text-clay" size={30} aria-hidden="true" /><h1 className="mt-5 font-display text-4xl">Composing your plan…</h1><p className="mt-3 text-sm text-muted">Balancing the budget and putting every milestone in place.</p></main>;

  return <div className="min-h-dvh">
    <header className="mx-auto flex max-w-[1500px] items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-5 sm:px-8"><Logo /><Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">Save & exit</Link></header>
    <div className="mx-auto grid max-w-[1500px] gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1fr_390px] lg:px-12">
      <main id="main-content" className="mx-auto w-full max-w-[760px] lg:mx-0">
        <nav aria-label="Planning progress" className="mb-10">
          <ol className="flex items-center gap-2">
            {steps.map((label, index) => <li key={label} className="flex flex-1 flex-col gap-2"><div className={cn("h-1 rounded-full transition-colors", index <= step ? "bg-clay" : "bg-line")} /><span className={cn("hidden text-[10px] font-bold tracking-wider uppercase sm:block", index === step ? "text-clay" : "text-muted/60")} aria-current={index === step ? "step" : undefined}>{index + 1}. {label}</span></li>)}
          </ol>
          <p className="mt-3 text-xs font-semibold text-muted sm:hidden">Step {step + 1} of 5 · {steps[step]}</p>
        </nav>

        {isEdit && <div className="mb-6 rounded-2xl border border-clay/20 bg-blush/60 p-4 text-sm leading-6 text-ink"><strong>Editing your brief.</strong> Budget recommendations and generated tasks refresh, but your edited tasks, vendor details, custom lines, guests, and run sheet are kept.</div>}
        {Object.keys(errors).length > 0 && <div ref={errorRef} tabIndex={-1} role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 outline-none"><strong>A few details need attention.</strong> Check the highlighted fields below.</div>}

        <section aria-labelledby="step-title" className="animate-rise" key={step}>
          {step === 0 && <>
            <Eyebrow>Let’s begin with the occasion</Eyebrow><h1 id="step-title" className="mt-3 font-display text-5xl font-medium tracking-[-.04em]">What are we bringing to life?</h1><p className="mt-4 text-[15px] leading-7 text-muted">Choose one. Every recommendation, checklist, and deadline will adapt.</p>
            <fieldset className="mt-9"><legend className="sr-only">Event type</legend><div className="grid gap-4 sm:grid-cols-3">{EVENT_TYPES.map((type) => { const item = getPack(type); const Icon = icons[type]; const selected = brief.eventType === type; return <label key={type} className={cn("relative flex min-h-52 cursor-pointer flex-col rounded-3xl border bg-paper p-5 transition hover:-translate-y-1", selected ? "border-clay ring-4 ring-clay/10" : "border-line")}><input type="radio" name="eventType" value={type} checked={selected} onChange={() => chooseType(type)} className="sr-only" /><span className={cn("grid size-11 place-items-center rounded-2xl", selected ? "bg-clay text-white" : "bg-blush text-clay")}><Icon size={21} aria-hidden="true" /></span><span className="mt-auto pt-8 font-display text-2xl font-medium">{item.label}</span><span className="mt-2 text-xs leading-5 text-muted">{item.description}</span>{selected && <span className="absolute top-5 right-5 grid size-5 place-items-center rounded-full bg-clay text-white"><Check size={12} aria-hidden="true" /></span>}</label>; })}</div></fieldset>
            {brief.eventType === "wedding" && <div className="mt-6"><AiBuilder onApply={(next) => { interactedRef.current = true; setBrief(next); setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} /></div>}
            {brief.eventType === "wedding" && <fieldset className="mt-6 rounded-2xl border border-line bg-paper/60 p-4"><legend className="px-2 text-sm font-semibold">Tradition & region</legend><p className="text-xs leading-5 text-muted">This changes the typical functions, ritual lead, food defaults, and vendor checklist. You can override every part.</p><div className="mt-3 flex flex-wrap gap-2">{TRADITION_OPTIONS.map((tradition) => { const selected = brief.tradition === tradition.id; return <button key={tradition.id} type="button" onClick={() => { update("tradition", tradition.id); update("functions", []); }} aria-pressed={selected} className={cn("min-h-10 rounded-full border px-3.5 text-xs font-medium transition", selected ? "border-sage bg-[#e8ede6] text-sage" : "border-line bg-paper text-muted hover:border-clay")}>{selected && <Check className="mr-1 inline" size={12} aria-hidden="true" />}{tradition.label}</button>; })}</div></fieldset>}
          </>}

          {step === 1 && <>
            <Eyebrow>The people and the moment</Eyebrow><h1 id="step-title" className="mt-3 font-display text-5xl font-medium tracking-[-.04em]">Give us the basics.</h1><p className="mt-4 text-[15px] text-muted">A working title is perfect. You can change every detail later.</p>
            <div className="mt-9 grid gap-6 sm:grid-cols-2">
              <Field label="Event title" htmlFor="title" error={errors.title}><Input id="title" value={brief.title} onChange={(e) => update("title", e.target.value)} aria-invalid={Boolean(errors.title)} maxLength={100} placeholder="Maya & Dev’s wedding" /></Field>
              <Field label={pack.terminology.host} htmlFor="hostNames" error={errors.hostNames}><Input id="hostNames" value={brief.hostNames} onChange={(e) => update("hostNames", e.target.value)} aria-invalid={Boolean(errors.hostNames)} maxLength={100} placeholder={brief.eventType === "wedding" ? "Maya & Dev" : "Your name or team"} /></Field>
              <Field label="Event date" htmlFor="date" error={errors.date}><Input id="date" type="date" min={toISODate(addDays(new Date(), 1))} value={brief.date} onChange={(e) => update("date", e.target.value)} aria-invalid={Boolean(errors.date)} /></Field>
              <Field label="Expected guests" htmlFor="guests" error={errors.guests}><Input id="guests" type="number" min={1} max={100000} value={brief.guests} onChange={(e) => update("guests", Number(e.target.value))} aria-invalid={Boolean(errors.guests)} /></Field>
            </div>
            <div className="mt-7 flex items-center gap-3 rounded-2xl bg-soft/70 p-4 text-sm text-muted"><CalendarDays size={19} className="shrink-0 text-clay" aria-hidden="true" /><span>That gives us <strong className="text-ink">{days} days</strong> to build a calm, realistic path to {formatDate(brief.date)}.</span></div>
            {brief.eventType === "wedding" && <>
              <fieldset className="mt-8">
                <legend className="text-sm font-semibold">Functions you are hosting</legend>
                <p className="mt-1 text-xs leading-5 text-muted">Dates start from the wedding date and can be edited later in the Functions view.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {functionChoices.map((kind) => {
                    const selected = selectedFunctions.some((item) => item.kind === kind);
                    return <button key={kind} type="button" aria-pressed={selected} onClick={() => toggleFunction(kind)} className={cn("min-h-10 rounded-full border px-3.5 text-xs font-medium transition", selected ? "border-sage bg-[#e8ede6] text-sage" : "border-line bg-paper text-muted hover:border-clay")}>{selected && <Check className="mr-1 inline" size={12} aria-hidden="true" />}{functionKindLabel(kind)}</button>;
                  })}
                </div>
              </fieldset>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedFunctions.map((item) => <div key={item.kind} className="rounded-2xl border border-line bg-paper p-4">
                  <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{item.name}</span><span className="text-[10px] font-bold tracking-wider text-muted uppercase">{functionKindLabel(item.kind)}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Date" htmlFor={`fn-${item.kind}-date`}><Input id={`fn-${item.kind}-date`} type="date" value={item.date} onChange={(event) => { if (event.target.value) updateFunction(item.kind, { date: event.target.value }); }} aria-label={`${item.name} date`} /></Field>
                    <Field label="Guests" htmlFor={`fn-${item.kind}-guests`}><Input id={`fn-${item.kind}-guests`} type="number" min={1} max={100000} value={item.guestCount} onChange={(event) => updateFunction(item.kind, { guestCount: Math.max(1, Number(event.target.value) || 1) })} aria-label={`${item.name} guests`} /></Field>
                  </div>
                </div>)}
              </div>
              <fieldset className="mt-6 rounded-2xl border border-line bg-paper/60 p-4">
                <legend className="px-2 text-sm font-semibold">Muhurat (optional)</legend>
                <p className="text-xs leading-5 text-muted">Add the window from your pandit. We never invent auspicious dates.</p>
                {brief.muhurat ? <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Date" htmlFor="muhurat-date"><Input id="muhurat-date" type="date" value={brief.muhurat.date} onChange={(event) => { const date = event.target.value; if (!date) return; const suggestion = findMuhuratSuggestion(date); updateMuhurat({ date, label: suggestion?.label ?? brief.muhurat?.label ?? "Muhurat", source: suggestion?.source ?? brief.muhurat?.source ?? "Entered by you", start: brief.muhurat?.start || suggestion?.start || "", end: brief.muhurat?.end || suggestion?.end || "" }); }} /></Field>
                  <Field label="Start" htmlFor="muhurat-start"><Input id="muhurat-start" type="time" value={brief.muhurat.start} onChange={(event) => updateMuhurat({ start: event.target.value })} /></Field>
                  <Field label="End" htmlFor="muhurat-end"><Input id="muhurat-end" type="time" value={brief.muhurat.end} onChange={(event) => updateMuhurat({ end: event.target.value })} /></Field>
                  <div className="sm:col-span-3"><Button variant="ghost" size="sm" onClick={() => update("muhurat", undefined)}>Remove muhurat</Button></div>
                </div> : <Button variant="secondary" size="sm" className="mt-3" onClick={() => update("muhurat", { date: brief.date, start: "", end: "", label: "Muhurat", source: "Entered by you" })}><CalendarDays size={14} aria-hidden="true" /> Add muhurat window</Button>}
                <p className="mt-3 text-[11px] leading-5 text-muted">{MUHURAT_CAVEAT}</p>
              </fieldset>
            </>}
          </>}

          {step === 2 && <>
            <Eyebrow>Place and practicalities</Eyebrow><h1 id="step-title" className="mt-3 font-display text-5xl font-medium tracking-[-.04em]">Ground it in reality.</h1><p className="mt-4 text-[15px] text-muted">We use this to make the budget fit your guest count and local cost level.</p>
            <div className="mt-9 grid gap-6">
              <Field label="City or area" htmlFor="location" error={errors.location}><CityCombobox value={brief.location} onChange={(value) => { update("location", value); update("costLevel", inferCostLevel(value)); }} error={errors.location} /></Field>
              <p className="-mt-3 text-xs leading-5 text-muted">{cityTierLabel(brief.location)} · we set a starting cost level from the city. Override it below if your venue is different.</p>
              <Field label="Total event budget" hint="INR" htmlFor="budget" error={errors.budget}><div className="relative"><span className="absolute top-3.5 left-4 text-muted">₹</span><Input id="budget" className="pl-9 font-display text-2xl" type="number" min={1000} step={10000} value={brief.budget} onChange={(e) => update("budget", Number(e.target.value))} aria-invalid={Boolean(errors.budget)} /></div></Field>
              <input aria-label={`Budget slider, ${formatMoney(brief.budget)}`} type="range" min={10000} max={brief.eventType === "wedding" ? 10000000 : 5000000} step={10000} value={Math.min(brief.budget, brief.eventType === "wedding" ? 10000000 : 5000000)} onChange={(e) => update("budget", Number(e.target.value))} className="h-2 w-full cursor-pointer accent-clay" />
              <fieldset><legend className="mb-3 text-sm font-semibold">How expensive is your area?</legend><div className="grid grid-cols-3 gap-3">{(["low", "average", "high"] as const).map((level) => <label key={level} className={cn("cursor-pointer rounded-2xl border px-3 py-4 text-center transition", brief.costLevel === level ? "border-clay bg-blush" : "border-line bg-paper")}><input type="radio" name="costLevel" className="sr-only" checked={brief.costLevel === level} onChange={() => update("costLevel", level)} /><span className="block text-sm font-semibold capitalize">{level}</span><span className="mt-1 block text-[11px] text-muted">{level === "low" ? "Lower-cost market" : level === "average" ? "Typical city" : "Major metro"}</span></label>)}</div></fieldset>
            </div>
          </>}

          {step === 3 && <>
            <Eyebrow>Spend on what you’ll remember</Eyebrow><h1 id="step-title" className="mt-3 font-display text-5xl font-medium tracking-[-.04em]">Choose your top three.</h1><p className="mt-4 text-[15px] text-muted">Your budget will favor these without neglecting the essentials.</p>
            <fieldset className="mt-9"><legend className="mb-4 text-sm font-semibold">Priorities <span className="font-normal text-muted">({brief.priorities.length}/3 selected)</span></legend><div className="grid gap-3 sm:grid-cols-2">{pack.priorities.map((priority) => { const selected = brief.priorities.includes(priority.id); return <label key={priority.id} className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition", selected ? "border-clay bg-blush" : "border-line bg-paper hover:border-muted/50")}><input type="checkbox" className="sr-only" checked={selected} onChange={() => { if (selected) update("priorities", brief.priorities.filter((id) => id !== priority.id)); else if (brief.priorities.length < 3) update("priorities", [...brief.priorities, priority.id]); }} /><span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", selected ? "border-clay bg-clay text-white" : "border-line")}>{selected && <Check size={14} aria-hidden="true" />}</span><span className="text-sm font-semibold">{priority.label}</span></label>; })}</div>{errors.priorities && <p role="alert" className="mt-3 text-sm text-red-700">{errors.priorities}</p>}</fieldset>
          </>}

          {step === 4 && <>
            <Eyebrow>The part that makes it yours</Eyebrow><h1 id="step-title" className="mt-3 font-display text-5xl font-medium tracking-[-.04em]">How should it feel?</h1><p className="mt-4 text-[15px] text-muted">This guides the ideas and the voice of your planning copilot.</p>
            <fieldset className="mt-8"><legend className="sr-only">Event style</legend><div className="grid gap-3 sm:grid-cols-2">{pack.vibes.map((vibe) => <label key={vibe.id} className={cn("cursor-pointer rounded-2xl border p-5 transition", brief.vibe === vibe.id ? "border-clay bg-blush" : "border-line bg-paper")}><input type="radio" name="vibe" className="sr-only" checked={brief.vibe === vibe.id} onChange={() => update("vibe", vibe.id)} /><span className="font-display text-xl font-medium">{vibe.label}</span><span className="mt-2 block text-xs leading-5 text-muted">{vibe.description}</span></label>)}</div></fieldset>
            <div className="mt-7"><Field label="Anything else we should know?" hint="Optional" htmlFor="notes"><Textarea id="notes" value={brief.notes} onChange={(e) => update("notes", e.target.value)} maxLength={1200} placeholder="A rooftop dinner, lots of speeches, and a dance floor for every generation…" /></Field></div>
            <fieldset className="mt-6"><legend className="text-sm font-semibold">Guest needs to plan around <span className="font-normal text-muted">(optional)</span></legend><div className="mt-3 flex flex-wrap gap-2">{CONSTRAINT_OPTIONS.map((constraint) => { const selected = brief.constraints.includes(constraint); return <button key={constraint} type="button" aria-pressed={selected} onClick={() => update("constraints", selected ? brief.constraints.filter((item) => item !== constraint) : [...brief.constraints, constraint])} className={cn("min-h-10 rounded-full border px-3.5 text-xs font-medium transition", selected ? "border-sage bg-[#e8ede6] text-sage" : "border-line bg-paper text-muted")}>{selected && <Check className="mr-1 inline" size={12} aria-hidden="true" />}{constraint}</button>; })}</div></fieldset>
          </>}
        </section>

        <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
          <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ArrowLeft size={16} aria-hidden="true" /> Back</Button>
          {step < 4 ? <Button size="lg" onClick={next}>Continue <ArrowRight size={17} aria-hidden="true" /></Button> : <Button size="lg" onClick={submit}><Sparkles size={17} aria-hidden="true" /> {isEdit ? "Rebuild my plan" : "Create my plan"}</Button>}
        </div>
      </main>

      <aside className="hidden lg:block" aria-label="Live plan summary"><div className="sticky top-8"><Card className="overflow-hidden"><div className="bg-ink p-6 text-white"><Eyebrow className="text-[#dca68e]">Your plan, taking shape</Eyebrow><h2 className="mt-3 font-display text-3xl font-medium break-words">{brief.title || "Your event"}</h2><p className="mt-2 flex items-center gap-2 text-xs text-white/60"><MapPin size={12} aria-hidden="true" />{brief.location || "Location to be decided"}</p></div><div className="p-6"><div className="grid grid-cols-3 divide-x divide-line text-center"><div><strong className="block font-display text-2xl font-medium">{brief.guests || 0}</strong><span className="text-[10px] tracking-wider text-muted uppercase">guests</span></div><div><strong className="block font-display text-2xl font-medium">{days > 0 ? days : "—"}</strong><span className="text-[10px] tracking-wider text-muted uppercase">days</span></div><div><strong className="block font-display text-2xl font-medium">{formatMoney(brief.budget / Math.max(1, brief.guests))}</strong><span className="text-[10px] tracking-wider text-muted uppercase">per guest</span></div></div><div className="my-6 h-px bg-line" /><p className="mb-4 text-[10px] font-bold tracking-wider text-muted uppercase">Smart budget preview</p>{preview.map((category) => <div key={category.id} className="mb-4"><div className="mb-1.5 flex justify-between gap-3 text-xs"><span>{category.name}</span><span className="font-semibold">{formatMoney(category.recommended)}</span></div><div className="h-1.5 rounded-full bg-soft"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, category.recommended / Math.max(1, brief.budget) * 100)}%`, background: category.color }} /></div></div>)}<p className="mt-5 text-xs leading-5 text-muted">These are live planning estimates—not generic packages. They respond to your guests, location, and priorities.</p></div></Card><div className="mt-4 flex gap-3 rounded-2xl border border-line/70 p-4 text-xs leading-5 text-muted"><Sparkles size={17} className="shrink-0 text-clay" aria-hidden="true" />AI personalizes the ideas after the planning engine gets your numbers exactly right.</div></div></aside>
    </div>
  </div>;
}
