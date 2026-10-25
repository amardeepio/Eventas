"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUp, Bot, Sparkles, Square, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/ui/markdown-text";
import { ThinkingIndicator } from "@/components/ui/thinking-indicator";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { usePlan } from "@/lib/storage/plan-store";
import { useLanguage } from "@/lib/i18n/language-provider";
import { cn } from "@/lib/utils/cn";

interface Message { role: "user" | "assistant"; content: string }
const quickPrompts = ["What should I do this month?", "Where am I overspending?", "What am I forgetting?", "Build a day-of run sheet", "Help me prioritize vendors"];
const greeting = "I’m your Eventas copilot. I know your brief, budget, timeline, and vendor checklist. What would make planning feel lighter?";

export function Assistant({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { plan } = usePlan();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef("");

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: loading ? "auto" : "smooth" }); }, [messages, loading]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || !plan || loading) return;
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history); setInput(""); setLoading(true); setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, messages: history.slice(-12), language }), signal: controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "The assistant is unavailable right now.");
      }
      if (!response.body) throw new Error("No response stream");
      setMode(response.headers.get("X-Eventas-Mode") === "live" ? "live" : "demo");
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
      if (!answerRef.current.trim()) throw new Error("The assistant returned an empty response.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setMessages((current) => current.map((message, index) => index === current.length - 1 && message.role === "assistant" && !message.content ? { ...message, content: "Stopped. What else would you like to work through?" } : message));
      } else {
        setMessages((current) => current.filter((message, index) => !(index === current.length - 1 && message.role === "assistant" && !message.content)));
        setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      }
    } finally { setLoading(false); abortRef.current = null; }
  }

  return <Dialog.Root open={open} onOpenChange={(next) => { onOpenChange(next); if (next && "vibrate" in navigator) navigator.vibrate(8); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" /><Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-bone pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[-20px_0_70px_rgba(40,30,20,.15)] outline-none data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out sm:max-w-[480px]" onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}>
    <div className="flex items-center gap-3 border-b border-line bg-paper/70 px-5 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ink text-white"><Sparkles size={18} aria-hidden="true" /></span><div className="min-w-0 flex-1"><Dialog.Title className="font-display text-xl font-medium">{t("Ask Eventas")}</Dialog.Title><Dialog.Description className="truncate text-[11px] text-muted">{mode === "live" ? t("Groq-powered · knows your full plan") : mode === "demo" ? t("Local demo copilot · knows your full plan") : t("Your context-aware planning copilot")}</Dialog.Description></div><LanguageSwitcher label="Assistant language" className="hidden shrink-0 sm:inline-flex" /><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={t("Close assistant")}><X size={19} /></Button></Dialog.Close></div>
    <div ref={scrollRef} role="log" aria-label={t("Conversation")} aria-live={loading ? "off" : "polite"} aria-relevant="additions text" className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-6">
      {messages.map((message, index) => <div key={index} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}><span className={cn("grid size-7 shrink-0 place-items-center rounded-full", message.role === "assistant" ? "bg-blush text-clay" : "bg-soft text-muted")} aria-hidden="true">{message.role === "assistant" ? <Bot size={14} /> : <User size={14} />}</span><div translate="no" className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-6", message.role === "assistant" ? "rounded-tl-sm border border-line bg-paper text-ink" : "rounded-tr-sm bg-ink text-white")}><span className="sr-only">{message.role === "assistant" ? "Eventas: " : "You: "}</span><MarkdownText content={index === 0 && message.role === "assistant" ? t(message.content) : message.content} />{loading && index === messages.length - 1 && message.role === "assistant" && !message.content && <ThinkingIndicator />}</div></div>)}
      {loading && messages.at(-1)?.role === "user" && <div className="ml-10"><ThinkingIndicator /></div>}
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800">{t(error)}</div>}
    </div>
    <div className="border-t border-line bg-paper p-4">
      {messages.length < 3 && <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label={t("Suggested questions")}>{quickPrompts.map((prompt) => <button key={prompt} onClick={() => send(t(prompt))} className="min-h-9 shrink-0 rounded-full border border-line bg-bone px-3 text-[11px] font-medium text-muted transition hover:border-clay hover:text-ink active:scale-[.96]">{t(prompt)}</button>)}</div>}
      <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-end gap-2 rounded-3xl border border-line bg-white p-2 focus-within:border-clay focus-within:ring-4 focus-within:ring-clay/10"><label htmlFor="assistant-input" className="sr-only">{t("Ask about your event plan")}</label><textarea id="assistant-input" ref={inputRef} rows={1} value={input} onChange={(event) => setInput(event.target.value.slice(0, 2000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} enterKeyHint="send" autoComplete="off" placeholder={t("Ask about budget, vendors, next steps…")} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted/60" />{loading ? <Button type="button" size="icon" variant="secondary" className="size-10 min-h-10" onClick={() => abortRef.current?.abort()} aria-label={t("Stop generating")}><Square size={14} fill="currentColor" /></Button> : <Button type="submit" size="icon" className="size-10 min-h-10" disabled={!input.trim()} aria-label={t("Send message")}><ArrowUp size={18} /></Button>}</form>
      <p className="mt-2 text-center text-[10px] leading-4 text-muted">{t("AI can make mistakes. Estimates aren’t quotes; confirm important details with vendors.")}</p>
    </div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
