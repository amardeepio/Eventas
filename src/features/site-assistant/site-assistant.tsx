"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUp, MessageCircle, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/ui/markdown-text";
import { ThinkingIndicator } from "@/components/ui/thinking-indicator";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getLanguage } from "@/lib/i18n/languages";
import { useLanguage } from "@/lib/i18n/language-provider";
import { cn } from "@/lib/utils/cn";

interface Message { role: "user" | "assistant"; content: string }

const quickPrompts = ["How is my data saved?", "How is the budget calculated?", "Which events can I plan?"];
const greeting = "Hi, I’m the Eventas guide. Ask me about how planning works, budgets in ₹, privacy, or which events you can plan.";

export function SiteAssistant() {
  const { t, language } = useLanguage();
  const nativeLabel = getLanguage(language).nativeLabel;
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"live" | "demo" | "guard" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const answerRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: loading ? "auto" : "smooth" });
  }, [messages, loading]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/site-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), language }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "The guide is unavailable right now.");
      }
      if (!response.body) throw new Error("No response stream");
      setMode(response.headers.get("X-Eventas-Guard") === "blocked"
        ? "guard"
        : response.headers.get("X-Eventas-Mode") === "live" ? "live" : "demo");
      setMessages((current) => [...current, { role: "assistant", content: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      answerRef.current = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answerRef.current += decoder.decode(value, { stream: true });
        const answer = answerRef.current;
        setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: answer } : message));
      }
      if (!answerRef.current.trim()) throw new Error("The guide returned an empty response.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setMessages((current) => current.map((message, index) => index === current.length - 1 && !message.content
          ? { ...message, content: "Stopped. Ask me anything else about Eventas." }
          : message));
      } else {
        setMessages((current) => current.filter((message, index) => !(index === current.length - 1 && message.role === "assistant" && !message.content)));
        setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button data-testid="site-assistant-trigger" className="group fixed right-4 bottom-4 z-40 inline-flex min-h-13 items-center gap-2.5 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(40,30,20,.28)] transition hover:-translate-y-0.5 hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-clay sm:right-6 sm:bottom-6" aria-label={t("Ask about Eventas")}>
        <span className="relative grid size-7 place-items-center rounded-full bg-white/10"><MessageCircle size={15} aria-hidden="true" /><span className="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full bg-[#dca68e] ring-2 ring-ink" /></span>
        <span className="hidden sm:inline">{t("Ask about Eventas")}</span>
        <span className="sm:hidden">{t("Ask")}</span>
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px] data-[state=open]:animate-rise" />
      <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 flex h-[min(78vh,620px)] flex-col overflow-hidden rounded-[2rem] border border-line bg-bone shadow-[0_25px_90px_rgba(40,30,20,.24)] outline-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px]" onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}>
        <div className="flex items-center gap-3 border-b border-line bg-paper/80 px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ink text-white"><Sparkles size={17} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <Dialog.Title className="font-display text-xl font-medium">{t("Ask about Eventas")}</Dialog.Title>
            <Dialog.Description className="truncate text-[11px] text-muted">
              {mode === "live" ? t("Groq-powered product guide") : mode === "guard" ? t("Guardrail active · ask a planning question") : t("Product guide · answers in {language}", { language: nativeLabel })}
            </Dialog.Description>
          </div>
          <LanguageSwitcher label="Assistant language" className="hidden shrink-0 sm:inline-flex" />
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={t("Close Eventas guide")}><X size={19} /></Button></Dialog.Close>
        </div>

        <div ref={scrollRef} role="log" aria-label={t("Eventas guide conversation")} aria-live={loading ? "off" : "polite"} aria-relevant="additions text" className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {messages.map((message, index) => <div key={index} className={cn("flex gap-2.5", message.role === "user" && "flex-row-reverse")}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold", message.role === "assistant" ? "bg-blush text-clay" : "bg-soft text-muted")} aria-hidden="true">{message.role === "assistant" ? <Sparkles size={13} /> : "You"}</span>
            <div translate="no" className={cn("max-w-[84%] rounded-2xl px-4 py-3 text-[13px] leading-6", message.role === "assistant" ? "rounded-tl-sm border border-line bg-paper text-ink" : "rounded-tr-sm bg-ink text-white")}>
              <span className="sr-only">{message.role === "assistant" ? "Eventas guide: " : "You: "}</span>
              <MarkdownText content={index === 0 && message.role === "assistant" ? t(message.content) : message.content} />
              {loading && index === messages.length - 1 && message.role === "assistant" && !message.content && <ThinkingIndicator />}
            </div>
          </div>)}
          {loading && messages.at(-1)?.role === "user" && <div className="ml-10"><ThinkingIndicator /></div>}
          {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800">{t(error)}</div>}
        </div>

        <div className="border-t border-line bg-paper p-4">
          {messages.length < 3 && <div className="mb-3 flex flex-wrap gap-2" aria-label={t("Suggested questions")}>{quickPrompts.map((prompt) => <button key={prompt} onClick={() => send(t(prompt))} className="min-h-9 rounded-full border border-line bg-bone px-3 text-[11px] font-medium text-muted transition hover:border-clay hover:text-ink">{t(prompt)}</button>)}</div>}
          <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-end gap-2 rounded-3xl border border-line bg-white p-2 focus-within:border-clay focus-within:ring-4 focus-within:ring-clay/10">
            <label htmlFor="site-assistant-input" className="sr-only">{t("Ask about Eventas")}</label>
            <textarea id="site-assistant-input" ref={inputRef} rows={1} value={input} onChange={(event) => setInput(event.target.value.slice(0, 2000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder={t("Ask about Eventas…")} className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted/60" />
            {loading
              ? <Button type="button" size="icon" variant="secondary" className="size-10 min-h-10" onClick={() => abortRef.current?.abort()} aria-label={t("Stop generating")}><Square size={14} fill="currentColor" /></Button>
              : <Button type="submit" size="icon" className="size-10 min-h-10" disabled={!input.trim()} aria-label={t("Send question")}><ArrowUp size={18} /></Button>}
          </form>
          <p className="mt-2 text-center text-[10px] leading-4 text-muted">{t("Product guidance only · never share passwords or API keys.")}</p>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
