"use client";

import { useState } from "react";
import { Check, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Eyebrow } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { briefSchema } from "@/lib/validation/schemas";
import { useLanguage } from "@/lib/i18n/language-provider";
import { getTradition } from "@/lib/domain/traditions";
import type { Brief } from "@/lib/domain/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

interface DraftResult {
  brief: Brief;
  assumptions: string[];
  questions: string[];
  mode?: string;
}

const examples = [
  "Punjabi wedding in Chandigarh, 350 guests, ₹45 lakh, November 2026, with mehndi, sangeet and reception.",
  "South Indian morning muhurtham in Chennai, 200 guests, ₹25 lakh, with a simple reception.",
  "Destination wedding in Udaipur, 150 guests, ₹60 lakh, three days, royal but not over the top.",
  "Muslim wedding in Hyderabad, 250 guests, ₹30 lakh, nikah and walima.",
];

export function AiBuilder({ onApply }: { onApply: (brief: Brief) => void }) {
  const { language } = useLanguage();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DraftResult | null>(null);

  async function draft() {
    const text = message.trim();
    if (text.length < 10) { setError("Add a little more detail first—city, guests, and budget help a lot."); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/ai/wedding-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language }),
      });
      const data = await response.json() as { brief?: unknown; assumptions?: unknown; questions?: unknown; mode?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not draft that just now. Try a shorter description.");
      const parsed = briefSchema.safeParse(data.brief);
      if (!parsed.success) throw new Error("The draft came back incomplete. Add the city, guest count, and budget, then try again.");
      setResult({
        brief: parsed.data,
        assumptions: Array.isArray(data.assumptions) ? data.assumptions.filter((item): item is string => typeof item === "string").slice(0, 6) : [],
        questions: Array.isArray(data.questions) ? data.questions.filter((item): item is string => typeof item === "string").slice(0, 3) : [],
        mode: data.mode,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <Card className="border-clay/25 bg-blush/35 p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-clay text-white"><WandSparkles size={18} aria-hidden="true" /></span>
      <div>
        <Eyebrow>Build with AI</Eyebrow>
        <h2 className="mt-1 font-display text-2xl font-medium">Describe the wedding once.</h2>
        <p className="mt-1 text-xs leading-5 text-muted">We draft the functions, guests, budget, and muhurat—then show every assumption before you use it. No account, and demo mode works without a key.</p>
      </div>
    </div>

    <label htmlFor="ai-wedding-brief" className="mt-4 block text-sm font-semibold">Your wedding in a sentence</label>
    <Textarea
      id="ai-wedding-brief"
      value={message}
      onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
      placeholder="e.g. A Punjabi wedding in Chandigarh for 350 guests in November 2026, budget ₹45 lakh, with mehndi, sangeet, and a reception."
      className="mt-2 min-h-24 bg-white/80 text-sm"
    />
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Example descriptions">
      {examples.map((example) => <button key={example} type="button" onClick={() => setMessage(example)} className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-left text-[11px] leading-4 text-muted transition hover:border-clay hover:text-ink">{example.split(",")[0]}</button>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button onClick={draft} disabled={loading}><Sparkles size={15} aria-hidden="true" />{loading ? "Drafting…" : "Draft my wedding"}</Button>
      <span className="text-[11px] text-muted">Your description is sent to the AI only when you press this button.</span>
    </div>
    <div aria-live="polite">
      {loading && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-muted"><LoaderCircle className="animate-spin" size={13} />Building a multi-day draft and checking the budget…</p>}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>

    {result && <div className="mt-5 rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-clay uppercase">Draft plan</p>
          <h3 className="mt-1 font-display text-xl font-medium">{result.brief.title}</h3>
        </div>
        <Badge className={result.mode === "live" ? "border-sage/20 bg-[#e8ede6] text-sage" : ""}>{result.mode === "live" ? "Groq AI draft" : "Smart local draft"}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div><dt className="text-muted">Tradition</dt><dd className="mt-0.5 font-semibold">{getTradition(result.brief.tradition).label}</dd></div>
        <div><dt className="text-muted">Date</dt><dd className="mt-0.5 font-semibold">{formatDate(result.brief.date)}</dd></div>
        <div><dt className="text-muted">Guests</dt><dd className="mt-0.5 font-semibold">{result.brief.guests}</dd></div>
        <div><dt className="text-muted">Budget</dt><dd className="mt-0.5 font-semibold">{formatMoney(result.brief.budget)}</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {result.brief.functions.map((item) => <Badge key={item.kind} className="bg-bone font-normal">{item.name} · {formatDate(item.date)}</Badge>)}
      </div>
      {result.assumptions.length > 0 && <div className="mt-4">
        <p className="text-[10px] font-bold tracking-wider text-muted uppercase">Assumptions to review</p>
        <ul className="mt-2 space-y-1.5">{result.assumptions.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-muted"><Check className="mt-0.5 shrink-0 text-sage" size={12} aria-hidden="true" />{item}</li>)}</ul>
      </div>}
      {result.questions.length > 0 && <div className="mt-4 rounded-xl bg-soft/70 p-3">
        <p className="text-[10px] font-bold tracking-wider text-muted uppercase">Before we go further</p>
        <ul className="mt-2 space-y-1.5">{result.questions.map((item) => <li key={item} className="text-xs leading-5">• {item}</li>)}</ul>
      </div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onApply(result.brief)}><Check size={14} aria-hidden="true" />Use this brief</Button>
        <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Start over</Button>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-muted">Estimates, not quotes. Confirm muhurat with your pandit and legal or permit details with the right authority.</p>
    </div>}
  </Card>;
}
