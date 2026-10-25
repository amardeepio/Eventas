"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-provider";
import { cn } from "@/lib/utils/cn";

const THRESHOLD = 76;
const MAX_PULL = 128;

/**
 * Touch pull-to-refresh for phones.
 *
 * The browser's own pull-to-refresh is suppressed with `overscroll-behavior`
 * so the gesture can be shown in the product's own language and styling. It
 * never engages while a dialog is open, while scrolled, or from a form control.
 */
export function PullToRefresh() {
  const { t } = useLanguage();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;

    let startY = 0;
    let distance = 0;
    let tracking = false;

    const reset = () => {
      tracking = false;
      distance = 0;
      setPull(0);
    };

    const onStart = (event: TouchEvent) => {
      if (busy.current || event.touches.length !== 1) return;
      // Forms hold unsaved briefs, and the print view is a static document.
      if (window.location.pathname.startsWith("/new") || window.location.pathname.startsWith("/plan/print")) return;
      if (window.scrollY > 0) return;
      if (document.querySelector('[role="dialog"]')) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
      startY = event.touches[0]?.clientY ?? 0;
      tracking = true;
      distance = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const dy = (event.touches[0]?.clientY ?? 0) - startY;
      if (dy <= 0 || window.scrollY > 0) {
        distance = 0;
        setPull(0);
        return;
      }
      distance = Math.min(MAX_PULL, dy * 0.55);
      if (distance > 6 && event.cancelable) event.preventDefault();
      setPull(distance);
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (distance < THRESHOLD) {
        distance = 0;
        setPull(0);
        return;
      }
      busy.current = true;
      setRefreshing(true);
      setPull(THRESHOLD);
      if ("vibrate" in navigator) navigator.vibrate(12);
      window.setTimeout(() => window.location.reload(), 360);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, []);

  const visible = pull > 0 || refreshing;
  const progress = Math.min(1, pull / THRESHOLD);
  const offset = refreshing ? 8 : Math.min(40, Math.max(-56, pull - 64));

  return <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center pt-[env(safe-area-inset-top)]" aria-hidden={!visible}>
    <div
      className={cn(
        "mt-2 flex items-center gap-2 rounded-full border border-line bg-paper/95 px-3.5 py-2 shadow-[0_10px_30px_rgba(40,30,20,.18)] backdrop-blur transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        transform: `translateY(${offset}px)`,
        transition: refreshing ? "transform .18s ease-out" : pull > 0 ? "none" : "transform .22s ease-out, opacity .2s",
      }}
    >
      {refreshing
        ? <LoaderCircle size={15} className="animate-spin text-clay" aria-hidden="true" />
        : <ArrowDown size={15} className="text-clay" style={{ transform: `rotate(${progress * 180}deg)` }} aria-hidden="true" />}
      <span role="status" aria-live="polite" className="text-[11px] font-semibold text-ink">
        {refreshing ? t("Refreshing…") : progress >= 1 ? t("Release to refresh") : t("Pull to refresh")}
      </span>
    </div>
  </div>;
}
