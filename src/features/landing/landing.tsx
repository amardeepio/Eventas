import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Flower2, Heart, MapPin, PartyPopper, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/card";
import { SavedPlanLink } from "./saved-plan-link";
import { SiteAssistant } from "@/features/site-assistant/site-assistant";
import { getPack, getSampleBrief, packList } from "@/lib/domain/packs";
import { allocateBudget } from "@/lib/domain/engine/budget";
import { daysUntil, formatMoney } from "@/lib/utils/format";

const eventIcons = { wedding: Heart, birthday: PartyPopper, community: Users } as const;
const eventNumbers = { wedding: "01", birthday: "02", community: "03" } as const;

// A stable illustrative preview: no request-time values, so the landing page stays static.
const previewNow = new Date("2026-10-24T00:00:00Z");
const previewBrief = getSampleBrief("wedding", previewNow);
const previewBudget = allocateBudget(getPack("wedding"), previewBrief);
const previewTotal = previewBudget.reduce((sum, item) => sum + item.planned, 0);
const previewItems = ["catering", "venue", "photo"].flatMap((id) => {
  const item = previewBudget.find((category) => category.id === id);
  return item ? [{ ...item, width: `${Math.round(item.planned / previewTotal * 100)}%` }] : [];
});
const previewDays = daysUntil(previewBrief.date, previewNow);

export function Landing() {
  return <div className="min-h-screen overflow-hidden">
    <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
      <Logo />
      <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-5">
        <a href="#how-it-works" className="hidden min-h-11 items-center px-2 text-sm font-medium text-muted transition hover:text-ink sm:flex">How it works</a>
        <SavedPlanLink />
        <Link href="/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-clay-dark sm:px-5">Start planning <ArrowRight size={15} aria-hidden="true" /></Link>
      </nav>
    </header>

    <main id="main-content">
      <section className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-5 pt-12 pb-24 sm:px-8 lg:grid-cols-[1.03fr_.97fr] lg:px-12 lg:pt-20 lg:pb-32">
        <div className="absolute top-0 left-[42%] -z-10 size-[500px] rounded-full border border-clay/10" aria-hidden="true" />
        <div className="max-w-[680px] animate-rise">
          <Eyebrow className="mb-6 flex items-center gap-2"><Sparkles size={14} aria-hidden="true" /> AI-powered planning, human-sized decisions</Eyebrow>
          <h1 className="font-display text-[clamp(3.4rem,7vw,6.7rem)] leading-[.91] font-medium tracking-[-.055em] text-balance">
            Make room for<br /><em className="font-light text-clay">the moment.</em>
          </h1>
          <p className="mt-7 max-w-[570px] text-[17px] leading-8 text-muted text-pretty sm:text-lg">
            One thoughtful brief becomes your budget, countdown, vendor checklist, and a plan full of ideas that actually feel like you.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/new" className="inline-flex min-h-14 items-center gap-3 rounded-full bg-clay px-7 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(165,83,61,.2)] transition hover:-translate-y-0.5 hover:bg-clay-dark">Plan my event <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/new?sample=wedding" className="inline-flex min-h-14 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink underline decoration-line underline-offset-8 transition hover:decoration-clay">See a sample wedding <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted" aria-label="Product benefits">
            {["Ready in 60 seconds", "No sign-up", "Stored on your device"].map((item) => <li key={item} className="flex items-center gap-1.5"><Check size={14} className="text-sage" aria-hidden="true" />{item}</li>)}
          </ul>
        </div>
        <PlanningPreview />
      </section>

      <section aria-labelledby="event-types-title" className="border-y border-line/70 bg-paper/55 px-5 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><Eyebrow>Every kind of together</Eyebrow><h2 id="event-types-title" className="mt-3 font-display text-4xl font-medium tracking-[-.035em] sm:text-5xl">What are we planning?</h2></div>
            <div className="max-w-md"><p className="text-sm leading-6 text-muted">Three event types. One calm place for every decision, deadline, and detail.</p><p className="mt-2 text-xs text-muted">Prefer to look first? <Link href="/new?sample=wedding" className="font-semibold text-clay underline decoration-clay/30 underline-offset-4">Wedding</Link> · <Link href="/new?sample=birthday" className="font-semibold text-clay underline decoration-clay/30 underline-offset-4">Birthday</Link> · <Link href="/new?sample=community" className="font-semibold text-clay underline decoration-clay/30 underline-offset-4">Community</Link></p></div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {packList.map((pack) => {
              const Icon = eventIcons[pack.id];
              return <Link key={pack.id} href={`/new?type=${pack.id}`} className="group relative min-h-[330px] overflow-hidden rounded-[2rem] border border-line bg-paper p-7 transition duration-300 hover:-translate-y-1.5 hover:border-clay/40 hover:shadow-[0_24px_60px_rgba(55,43,32,.09)]">
                <div className="absolute -right-14 -bottom-20 size-56 rounded-full border-[35px] border-soft/70 transition duration-500 group-hover:scale-110 group-hover:border-blush/70" aria-hidden="true" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-blush text-clay"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span><span className="font-display text-sm text-muted">{eventNumbers[pack.id]}</span></div>
                  <div className="mt-auto pt-16"><p className="mb-2 text-[11px] font-bold tracking-[.15em] text-clay uppercase">{pack.eyebrow}</p><h3 className="font-display text-[32px] font-medium tracking-[-.03em]">{pack.label}</h3><p className="mt-3 text-sm leading-6 text-muted">{pack.description}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Start with a brief <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" /></span></div>
                </div>
              </Link>;
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-[1320px] px-5 py-28 sm:px-8 lg:px-12">
        <div className="grid gap-16 lg:grid-cols-[.75fr_1.25fr]">
          <div><Eyebrow>A calmer way to plan</Eyebrow><h2 id="how-title" className="mt-4 font-display text-5xl leading-[1.04] font-medium tracking-[-.045em] text-balance">From “where do we start?” to “we’ve got this.”</h2><p className="mt-6 text-[15px] leading-7 text-muted">Smart defaults do the organizing. You make the decisions that matter.</p></div>
          <ol className="divide-y divide-line border-y border-line">
            {[
              { icon: MapPin, n: "01", title: "Tell us what matters", text: "Date, place, people, budget, priorities, and the feeling you want. No endless questionnaire." },
              { icon: WalletCards, n: "02", title: "Get a plan that adds up", text: "A tested planning engine allocates every rupee and turns your date into practical, ordered milestones." },
              { icon: Sparkles, n: "03", title: "Make it unmistakably yours", text: "AI adds personal ideas and clear next steps. Ask anything, rebalance safely, and keep control." },
            ].map(({ icon: Icon, n, title, text }) => <li key={n} className="grid gap-4 py-8 sm:grid-cols-[44px_1fr_auto] sm:items-start"><span className="grid size-11 place-items-center rounded-full border border-line bg-paper text-clay"><Icon size={19} strokeWidth={1.6} aria-hidden="true" /></span><div><h3 className="font-display text-2xl font-medium">{title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted">{text}</p></div><span className="hidden font-display text-sm text-muted/50 sm:block">{n}</span></li>)}
          </ol>
        </div>
      </section>

      <section aria-labelledby="trust-title" className="px-5 pb-24 sm:px-8 lg:px-12">
        <div className="grain relative mx-auto grid max-w-[1320px] overflow-hidden rounded-[2.5rem] bg-ink px-7 py-12 text-white sm:px-12 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:px-16 lg:py-16">
          <Flower2 className="absolute -right-10 -bottom-12 size-64 text-white/5" strokeWidth={.6} aria-hidden="true" />
          <div className="relative"><Eyebrow className="text-[#dca68e]">Built on good judgment</Eyebrow><h2 id="trust-title" className="mt-4 font-display text-4xl leading-tight font-medium tracking-[-.035em]">AI for imagination.<br />Logic for the numbers.</h2></div>
          <div className="relative mt-8 grid gap-7 sm:grid-cols-3 lg:mt-0">
            {[{ icon: WalletCards, title: "Exact budgets", text: "Every allocation reconciles to your total." }, { icon: CalendarDays, title: "Real timelines", text: "Milestones adapt to the time you actually have." }, { icon: ShieldCheck, title: "Private by design", text: "Your plan stays in this browser. No account needed." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={22} className="mb-4 text-[#dca68e]" strokeWidth={1.4} aria-hidden="true" /><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-white/60">{text}</p></div>)}
          </div>
        </div>
      </section>
    </main>
    <footer className="mx-auto flex max-w-[1440px] flex-col gap-5 border-t border-line px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><Logo /><p>Thoughtful plans for meaningful gatherings.</p><p>Eventas · Local-first planning</p></footer>
    <SiteAssistant />
  </div>;
}

function PlanningPreview() {
  return <div className="relative mx-auto w-full max-w-[590px] lg:mx-0" aria-label="Preview of an Eventas wedding plan" role="img">
    <div className="absolute -top-8 -right-5 size-32 rounded-full border border-gold/30" aria-hidden="true" />
    <div className="relative rotate-[1.5deg] rounded-[2rem] border border-white/80 bg-paper p-5 shadow-[0_35px_90px_rgba(63,45,30,.14)] transition duration-500 hover:rotate-0 sm:p-7">
      <div className="flex items-start justify-between border-b border-line pb-5"><div><p className="text-[10px] font-bold tracking-[.17em] text-clay uppercase">Your wedding plan</p><h2 className="mt-2 font-display text-[28px] font-medium tracking-[-.03em]">Maya &amp; Dev</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><MapPin size={12} aria-hidden="true" /> Udaipur · 300 guests</p></div><span className="rounded-full bg-[#e9eee7] px-3 py-1.5 text-[10px] font-bold text-sage">ON TRACK</span></div>
      <div className="grid gap-5 py-6 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="relative mx-auto size-[130px]"><svg viewBox="0 0 130 130" className="-rotate-90" aria-hidden="true"><circle cx="65" cy="65" r="52" fill="none" stroke="#eee9df" strokeWidth="9"/><circle cx="65" cy="65" r="52" fill="none" stroke="#a5533d" strokeWidth="9" strokeLinecap="round" strokeDasharray="327" strokeDashoffset="92"/></svg><div className="absolute inset-0 grid place-content-center text-center"><strong className="font-display text-3xl font-medium">{previewDays}</strong><span className="text-[9px] font-bold tracking-wider text-muted uppercase">days to go</span></div></div>
        <div><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold tracking-wider text-muted uppercase">Total budget</p><p className="mt-1 font-display text-2xl">{formatMoney(previewTotal)}</p></div><p className="text-xs font-semibold text-sage">100% allocated</p></div>{previewItems.map((item) => <div key={item.id} className="mt-3"><div className="mb-1.5 flex justify-between text-[10px]"><span>{item.name}</span><span className="text-muted">{formatMoney(item.planned)}</span></div><div className="h-1.5 rounded-full bg-soft"><div className="h-full rounded-full" style={{ width: item.width, background: item.color }} /></div></div>)}</div>
      </div>
      <div className="rounded-2xl bg-bone p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold tracking-wider text-muted uppercase">Up next</p><CalendarDays size={14} className="text-muted" aria-hidden="true" /></div>{["Book the venue", "Book the pandit"].map((task, index) => <div key={task} className="flex items-center gap-3 border-t border-line/70 py-2.5 text-xs first:border-0"><span className="grid size-5 place-items-center rounded-full border border-clay/30 text-[9px] text-clay">{index + 1}</span><span className="font-medium">{task}</span><span className="ml-auto text-[10px] text-muted">{index ? "Nov 12" : "Oct 28"}</span></div>)}</div>
    </div>
    <div className="absolute -right-3 -bottom-9 w-[245px] -rotate-3 rounded-2xl border border-line bg-white p-4 shadow-[0_18px_50px_rgba(63,45,30,.13)] sm:-right-8"><div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-clay uppercase"><Sparkles size={13} aria-hidden="true" /> A thought from your planner</div><p className="mt-2 font-display text-[15px] leading-5">“Move the ceremony florals to dinner. Same beauty, one less thing to buy.”</p></div>
  </div>;
}
