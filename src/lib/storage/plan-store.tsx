"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Brief, Plan } from "../domain/types";
import { buildPlan } from "../domain/engine/plan";
import { aiPlanResponseSchema } from "../validation/schemas";
import { parseStoredPlan } from "./migrate";
import { useLanguage } from "../i18n/language-provider";

const STORAGE_KEY = "eventas.plan.v2";
const LEGACY_KEYS = ["eventas.plan.v1"];

interface PlanContextValue {
  plan: Plan | null;
  hydrated: boolean;
  createPlan: (brief: Brief) => Plan;
  updatePlan: (updater: (current: Plan) => Plan) => void;
  undo: () => void;
  canUndo: boolean;
  resetPlan: () => void;
  enrichWithAi: (plan: Plan) => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const planRef = useRef<Plan | null>(null);
  const history = useRef<Plan[]>([]);
  useEffect(() => { planRef.current = plan; }, [plan]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseStoredPlan(JSON.parse(stored));
        // Hydration from an external store necessarily happens after SSR.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed) setPlan(parsed);
        else localStorage.removeItem(STORAGE_KEY);
      } else {
        for (const key of LEGACY_KEYS) {
          const legacy = localStorage.getItem(key);
          if (!legacy) continue;
          const parsed = parseStoredPlan(JSON.parse(legacy));
          if (parsed) {
            setPlan(parsed);
          }
          localStorage.removeItem(key);
          break;
        }
      }
    } catch { localStorage.removeItem(STORAGE_KEY); }
     
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (plan) localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* Private browsing/storage quotas must not break planning. */ }
  }, [plan, hydrated]);

  const createPlan = useCallback((brief: Brief) => {
    const created = buildPlan(brief);
    history.current = [];
    setCanUndo(false);
    planRef.current = created;
    setPlan(created);
    return created;
  }, []);

  const updatePlan = useCallback((updater: (current: Plan) => Plan) => {
    const current = planRef.current;
    if (!current) return;
    const next = updater(current);
    if (next === current) return;
    history.current = [...history.current.slice(-19), current];
    setCanUndo(true);
    planRef.current = next;
    setPlan(next);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    planRef.current = previous;
    setPlan(previous);
    setCanUndo(history.current.length > 0);
  }, []);

  const resetPlan = useCallback(() => {
    history.current = [];
    setCanUndo(false);
    planRef.current = null;
    setPlan(null);
  }, []);

  const enrichWithAi = useCallback(async (source: Plan) => {
    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: source, language }),
      });
      if (!response.ok) return;
      const data: unknown = await response.json();
      const result = aiPlanResponseSchema.safeParse(data);
      if (!result.success || planRef.current?.id !== source.id) return;
      const mode = (data as { mode?: "live" | "demo" }).mode ?? "demo";
      updatePlan((current) => ({
        ...current,
        ai: { headline: result.data.headline, insights: result.data.insights, mode },
        ideas: result.data.ideas.map((idea, index) => ({
          ...idea,
          id: current.ideas[index]?.id ?? `${current.id}-idea-${index}`,
          saved: current.ideas.find((saved) => saved.title === idea.title)?.saved ?? false,
        })),
      }));
    } catch { /* Baseline plan is intentionally complete without enrichment. */ }
  }, [updatePlan, language]);

  const value = useMemo(() => ({ plan, hydrated, createPlan, updatePlan, undo, canUndo, resetPlan, enrichWithAi }), [plan, hydrated, createPlan, updatePlan, undo, canUndo, resetPlan, enrichWithAi]);
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan must be used inside PlanProvider");
  return context;
}
