"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import { cn } from "@/lib/utils/cn";

export interface TourStep {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  /** Selectors in priority order. The first visible match is highlighted. */
  targets?: string[];
  /** Parent view that must be active before this step can be measured. */
  view?: string;
  /** Optional hands-on action rendered inside the card. */
  action?: { label: string };
}

export interface TourShellProps {
  steps: TourStep[];
  onClose: () => void;
  onFinish?: () => void;
  finishLabel?: string;
  /** When set, the final primary action is a client-side link. */
  finishHref?: string;
  finishAction?: { label: string; onRun: () => void };
  /** Permanently dismiss the tour from the welcome step. */
  onDismiss?: () => void;
  /** Persist the current step (and optionally resume on a reload). */
  initialStepId?: string;
  onProgress?: (stepId: string) => void;
  /** The view currently rendered by the parent, for view-aware steps. */
  activeView?: string;
  onViewChange?: (view: string) => void;
  /** Runs an in-card action; return the success copy to confirm it happened. */
  onAction?: (stepId: string) => string | void;
  /** A short "what next" list on the final step. */
  finishSummary?: string[];
  testId?: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PositionResult {
  style: CSSProperties;
  placement: "right" | "left" | "below" | "above" | "corner" | "center" | "top" | "bottom";
}

const mobileBreakpoint = 768;
const cardGap = 18;
const edge = 16;

function findVisibleTarget(selectors: string[]) {
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      if (box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden") return node;
    }
  }
  return null;
}

function isFixedElement(element: HTMLElement) {
  let node: HTMLElement | null = element;
  while (node) {
    if (window.getComputedStyle(node).position === "fixed") return true;
    node = node.parentElement;
  }
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function getCardPosition(box: Box | null, height: number, viewportWidth: number, viewportHeight: number, isMobile: boolean): PositionResult {
  if (isMobile) {
    // A bottom-fixed target (such as the Ask button) would sit behind a bottom
    // sheet; flip the card to the top so the highlight stays visible.
    const targetNearBottom = box && box.top + box.height / 2 > viewportHeight * 0.68;
    if (targetNearBottom) {
      return { placement: "top", style: { left: edge, right: edge, top: `calc(${edge}px + env(safe-area-inset-top))` } };
    }
    return { placement: "bottom", style: { left: edge, right: edge, bottom: `calc(${edge}px + env(safe-area-inset-bottom))` } };
  }

  const cardWidth = Math.min(384, viewportWidth - edge * 2);
  if (!box) {
    return { placement: "center", style: { left: Math.max(edge, (viewportWidth - cardWidth) / 2), top: Math.max(edge, (viewportHeight - Math.max(height, 260)) / 2), width: cardWidth } };
  }

  const canFitRight = box.left + box.width + cardGap + cardWidth <= viewportWidth - edge;
  const canFitLeft = box.left - cardGap - cardWidth >= edge;
  const canFitBelow = box.top + box.height + cardGap + height <= viewportHeight - edge;
  const canFitAbove = box.top - cardGap - height >= edge;
  const verticalCenter = clamp(box.top + box.height / 2 - height / 2, edge, viewportHeight - height - edge);
  const horizontalCenter = clamp(box.left + box.width / 2 - cardWidth / 2, edge, viewportWidth - cardWidth - edge);

  if (box.left < viewportWidth * 0.46 && canFitRight) {
    return { placement: "right", style: { left: box.left + box.width + cardGap, top: verticalCenter, width: cardWidth } };
  }
  if (canFitBelow) return { placement: "below", style: { left: horizontalCenter, top: box.top + box.height + cardGap, width: cardWidth } };
  if (canFitAbove) return { placement: "above", style: { left: horizontalCenter, top: box.top - cardGap - height, width: cardWidth } };
  if (canFitRight) return { placement: "right", style: { left: box.left + box.width + cardGap, top: verticalCenter, width: cardWidth } };
  if (canFitLeft) return { placement: "left", style: { left: box.left - cardGap - cardWidth, top: verticalCenter, width: cardWidth } };

  // Large targets (often the hero card) leave no room beside them. Dock the
  // card in the corner so most of the highlight stays visible.
  return { placement: "corner", style: { left: viewportWidth - cardWidth - edge, top: viewportHeight - height - edge, width: cardWidth } };
}

export function TourShell({
  steps,
  onClose,
  activeView,
  onViewChange,
  onAction,
  onFinish,
  finishLabel,
  finishHref,
  finishAction,
  onDismiss,
  initialStepId,
  onProgress,
  finishSummary,
  testId = "guided-tour",
}: TourShellProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(() => {
    if (!initialStepId) return 0;
    const found = steps.findIndex((step) => step.id === initialStepId);
    return found >= 0 ? found : 0;
  });
  const [rect, setRect] = useState<(Box & { stepId: string }) | null>(null);
  const [viewport, setViewport] = useState(() => typeof window === "undefined"
    ? { width: 0, height: 0 }
    : { width: window.innerWidth, height: window.innerHeight });
  const [cardHeight, setCardHeight] = useState(0);
  const [actionResult, setActionResult] = useState<{ stepId: string; message: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const lastProgress = useRef<string | null>(null);

  const step = steps[Math.min(index, steps.length - 1)];
  const stepId = step.id;
  const targetKey = step.targets?.join("|") ?? "";
  const requiredView = step.view;
  const waitingForView = Boolean(requiredView && activeView && requiredView !== activeView);
  const isMobile = viewport.width > 0 && viewport.width < mobileBreakpoint;
  const isWelcome = index === 0;
  const isFinish = index === steps.length - 1;
  const contentCount = Math.max(1, steps.length - 2);
  const progress = Math.round(((index + 1) / steps.length) * 100);
  const actionDone = actionResult?.stepId === stepId;

  const next = useCallback(() => setIndex((current) => Math.min(current + 1, steps.length - 1)), [steps.length]);
  const back = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const tourRoot = cardRef.current?.closest("[data-tour-portal]");
    const changed: { element: Element; inert: boolean; hidden: string | null }[] = [];
    if (tourRoot) {
      for (const child of Array.from(document.body.children)) {
        if (child === tourRoot) continue;
        changed.push({ element: child, inert: child.hasAttribute("inert"), hidden: child.getAttribute("aria-hidden") });
        child.setAttribute("inert", "");
        child.setAttribute("aria-hidden", "true");
      }
    }
    return () => {
      for (const item of changed) {
        if (!item.inert) item.element.removeAttribute("inert");
        if (item.hidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.hidden);
      }
      previousFocus.current?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (lastProgress.current === stepId) return;
    lastProgress.current = stepId;
    onProgress?.(stepId);
  }, [stepId, onProgress]);

  // Ask the studio to switch views before a step that lives in another tab.
  useEffect(() => {
    if (requiredView && requiredView !== activeView) onViewChange?.(requiredView);
  }, [index, requiredView, activeView, onViewChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep focus inside the tour card while it is open.
      const node = cardRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, next, back]);

  // Prevent accidental clicks and page scrolling behind the spotlight.
  useEffect(() => {
    const block = (event: Event) => {
      if (cardRef.current?.contains(event.target as Node)) return;
      event.preventDefault();
    };
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.removeEventListener("wheel", block);
      document.removeEventListener("touchmove", block);
    };
  }, []);

  // Find, scroll to, and continuously measure the highlighted element.
  useEffect(() => {
    if (requiredView && requiredView !== activeView) return;
    const selectors = targetKey ? targetKey.split("|") : [];
    const target = selectors.length > 0 ? findVisibleTarget(selectors) : null;
    if (!target) {
      // Defer the clear so the effect body never triggers a synchronous render.
      const frame = window.requestAnimationFrame(() => setRect(null));
      return () => window.cancelAnimationFrame(frame);
    }

    const mobile = viewport.width > 0 && viewport.width < mobileBreakpoint;
    if (!isFixedElement(target)) {
      const box = target.getBoundingClientRect();
      const reserved = mobile ? Math.min(300, viewport.height * 0.42) : 80;
      const topLimit = 96;
      const bottomLimit = viewport.height - reserved;
      const available = bottomLimit - topLimit;
      let delta = 0;
      if (box.height > available) delta = box.top - topLimit - 10;
      else delta = box.top + box.height / 2 - (topLimit + available / 2);
      if (Math.abs(delta) > 4) {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollBy({ top: delta, behavior: reduceMotion ? "auto" : "smooth" });
      }
    }

    const measure = () => {
      const box = target.getBoundingClientRect();
      setRect({ stepId, top: box.top, left: box.left, width: box.width, height: box.height });
    };
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    // AI enrichment or an action can rewrite the layout mid-tour.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(target);
    observer?.observe(document.body);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [index, stepId, targetKey, requiredView, activeView, viewport.width, viewport.height]);

  // The card's height changes between steps; measure it so placement can adapt.
  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const measure = () => setCardHeight(node.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [index]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  if (!step) return null;

  // Ignore a measurement from the previous step or a view still switching in.
  const activeRect: Box | null = !waitingForView && rect && rect.stepId === stepId ? rect : null;
  const { style: position, placement } = getCardPosition(activeRect, cardHeight, viewport.width, viewport.height, isMobile);
  const Icon = step.icon;

  function runAction() {
    if (!step.action || !onAction) return;
    const message = onAction(stepId);
    if (message) setActionResult({ stepId, message });
  }

  function replay() {
    setIndex(0);
    setActionResult(null);
  }

  const arrowPosition: CSSProperties | null = activeRect && cardHeight > 0 && (placement === "right" || placement === "left" || placement === "below" || placement === "above")
    ? (() => {
      const left = typeof position.left === "number" ? position.left : 0;
      const top = typeof position.top === "number" ? position.top : 0;
      const width = typeof position.width === "number" ? position.width : 0;
      const anchorX = clamp(activeRect.left + activeRect.width / 2, left + 24, left + width - 24) - 6;
      const anchorY = clamp(activeRect.top + activeRect.height / 2, top + 24, top + cardHeight - 24) - 6;
      if (placement === "right") return { left: left - 6, top: anchorY };
      if (placement === "left") return { left: left + width - 6, top: anchorY };
      if (placement === "below") return { left: anchorX, top: top - 6 };
      return { left: anchorX, top: top + cardHeight - 6 };
    })()
    : null;

  return createPortal(<div className="fixed inset-0 z-[90]" role="presentation" data-tour-portal>
    {!activeRect && <div className="absolute inset-0 animate-fade-in bg-ink/60 backdrop-blur-[2px]" aria-hidden="true" />}

    {activeRect && <div
      key={`ring-${step.id}`}
      className="pointer-events-none fixed z-[91] animate-fade-in rounded-[26px] ring-2 ring-white/60"
      style={{
        top: activeRect.top - 9,
        left: activeRect.left - 9,
        width: activeRect.width + 18,
        height: activeRect.height + 18,
        boxShadow: "0 0 0 9999px rgba(30,25,20,.62), 0 0 0 1px rgba(255,255,255,.16), 0 22px 60px rgba(20,15,10,.18)",
      }}
      aria-hidden="true"
    />}

    {arrowPosition && <div className="pointer-events-none fixed z-[93] size-3 rotate-45 border border-line/80 bg-paper" style={arrowPosition} aria-hidden="true" />}

    <div
      key={step.id}
      ref={cardRef}
      role="dialog"
      data-testid={testId}
      data-step={step.id}
      aria-modal="true"
      aria-labelledby={`${testId}-title-${step.id}`}
      aria-describedby={`${testId}-body-${step.id}`}
      tabIndex={-1}
      className={cn(
        "fixed z-[92] flex max-h-[min(82dvh,560px)] flex-col overflow-y-auto rounded-[26px] border border-line/80 bg-paper p-5 shadow-[0_32px_90px_rgba(28,22,16,.4)] outline-none animate-rise scrollbar-thin sm:p-6",
        isMobile && "max-h-[min(72dvh,520px)]",
      )}
      style={position}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blush text-clay"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[.16em] text-clay uppercase">{step.eyebrow}</p>
          <h2 id={`${testId}-title-${step.id}`} className="mt-1 font-display text-[22px] leading-tight font-medium tracking-[-.02em] sm:text-2xl">{step.title}</h2>
        </div>
        <button onClick={onClose} aria-label={t("Close tour")} className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-soft hover:text-ink active:scale-[.95]"><X size={17} aria-hidden="true" /></button>
      </div>

      <p id={`${testId}-body-${step.id}`} className="mt-3 text-[13px] leading-6 text-muted sm:text-sm">{step.body}</p>

      {step.action && onAction && (actionDone
        ? <p role="status" className="mt-4 flex items-start gap-2 rounded-2xl border border-sage/20 bg-[#e8ede6] px-4 py-3 text-xs leading-5 font-medium text-sage"><Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{actionResult.message}</p>
        : <button onClick={runAction} className="group mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-clay/25 bg-blush/40 px-4 py-3 text-left transition hover:border-clay/45 hover:bg-blush/70 active:scale-[.99]">
          <span><span className="block text-[9px] font-bold tracking-[.16em] text-clay uppercase">{t("Try it with me")}</span><span className="mt-0.5 block text-xs font-semibold text-ink">{step.action.label}</span></span>
          <ArrowRight size={16} className="shrink-0 text-clay transition group-hover:translate-x-0.5" aria-hidden="true" />
        </button>)}

      {isFinish && finishSummary && finishSummary.length > 0 && <div className="mt-4 rounded-2xl border border-line/70 bg-bone/50 p-4">
        <p className="text-[9px] font-bold tracking-[.16em] text-muted uppercase">{t("What next")}</p>
        <ul className="mt-2 space-y-2">{finishSummary.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-ink/80"><Check size={14} className="mt-0.5 shrink-0 text-sage" aria-hidden="true" />{item}</li>)}</ul>
      </div>}

      <div className="mt-4 flex items-center gap-3" aria-hidden="true">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-clay transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
        <span className="text-[10px] font-semibold tabular-nums text-muted">{isWelcome || isFinish ? (isFinish ? t("Done") : t("Tour")) : `${index} / ${contentCount}`}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {isWelcome
          ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button onClick={onClose} className="min-h-9 rounded-full text-xs font-semibold text-muted transition hover:text-ink">{t("Skip tour")}</button>
            {onDismiss && <button onClick={onDismiss} className="min-h-9 rounded-full text-[11px] font-medium text-muted/80 underline decoration-line underline-offset-4 transition hover:text-ink">{t("Don’t show again")}</button>}
          </div>
          : isFinish
            ? <button onClick={replay} className="flex min-h-9 items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-muted transition hover:text-ink"><RotateCcw size={13} aria-hidden="true" />{t("Replay tour")}</button>
            : <Button variant="ghost" size="sm" onClick={back}><ArrowLeft size={14} aria-hidden="true" />{t("Back")}</Button>}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {isFinish && finishAction && <Button variant="secondary" size="sm" onClick={finishAction.onRun}>{finishAction.label}</Button>}
          {isWelcome
            ? <Button size="sm" onClick={next}>{t("Show me around")}<ArrowRight size={15} aria-hidden="true" /></Button>
            : isFinish
              ? finishHref
                ? <Link href={finishHref} onClick={onFinish} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-3.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-clay-dark hover:shadow-md active:scale-[.97]">{finishLabel ?? t("Start planning")}<Check size={15} aria-hidden="true" /></Link>
                : <Button size="sm" onClick={onFinish ?? onClose}>{finishLabel ?? t("Start planning")}<Check size={15} aria-hidden="true" /></Button>
              : <Button size="sm" onClick={next}>{t("Next")}<ArrowRight size={15} aria-hidden="true" /></Button>}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{`${step.title}. ${t("Step")} ${index + 1} ${t("of")} ${steps.length}`}</p>
    </div>
  </div>, document.body);
}
