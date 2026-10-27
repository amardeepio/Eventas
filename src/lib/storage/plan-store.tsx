"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Brief, Plan } from "../domain/types";
import { buildPlan } from "../domain/engine/plan";
import { rebuildPlan } from "../domain/engine/rebuild";
import { aiPlanResponseSchema } from "../validation/schemas";
import type { Workspace } from "../validation/schemas";
import { useLanguage } from "../i18n/language-provider";
import {
  addRevision,
  emptyWorkspace,
  loadRevisions,
  loadWorkspace,
  maybePersistStorage,
  saveRevisions,
  saveWorkspace,
} from "./workspace";
import type { PlanBackup } from "../validation/schemas";

interface PlanContextValue {
  plan: Plan | null;
  plans: Plan[];
  activePlanId: string | null;
  hydrated: boolean;
  storageError: string;
  createPlan: (brief: Brief) => Plan;
  updatePlan: (updater: (current: Plan) => Plan) => void;
  updateBrief: (brief: Brief) => Plan | null;
  switchPlan: (id: string) => void;
  duplicatePlan: (id: string) => Plan | null;
  archivePlan: (id: string, archived?: boolean) => void;
  deletePlan: (id: string) => void;
  importBackup: (backup: PlanBackup, mode: "merge" | "replace") => void;
  createBackup: () => PlanBackup;
  undo: () => void;
  canUndo: boolean;
  resetPlan: () => void;
  enrichWithAi: (plan: Plan) => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [revisions, setRevisions] = useState<Record<string, Plan[]>>({});
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState("");
  const workspaceRef = useRef<Workspace>(emptyWorkspace());
  const revisionsRef = useRef<Record<string, Plan[]>>({});
  const saveQueue = useRef(Promise.resolve());
  const revisionQueue = useRef(Promise.resolve());

  const plan = useMemo(
    () => workspace.plans.find((item) => item.id === workspace.activePlanId) ?? null,
    [workspace],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadWorkspace(), loadRevisions()]).then(([loadedWorkspace, loadedRevisions]) => {
      if (cancelled) return;
      // A sample deep link can create a plan before IndexedDB finishes opening.
      // Never let the slower hydration overwrite that newer in-memory work.
      const inFlight = workspaceRef.current;
      const merged = inFlight.plans.length > 0
        ? {
          version: 1 as const,
          activePlanId: inFlight.activePlanId ?? loadedWorkspace.activePlanId,
          plans: [...loadedWorkspace.plans.filter((item) => !inFlight.plans.some((current) => current.id === item.id)), ...inFlight.plans],
        }
        : loadedWorkspace;
      workspaceRef.current = merged;
      revisionsRef.current = { ...loadedRevisions, ...revisionsRef.current };
      setWorkspace(merged);
      setRevisions(revisionsRef.current);
      setHydrated(true);
      void maybePersistStorage();
    }).catch(() => {
      if (cancelled) return;
      setStorageError("This browser blocked local storage. Export a backup before closing the tab.");
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveQueue.current = saveQueue.current
      .then(() => saveWorkspace(workspace))
      .then(() => setStorageError(""))
      .catch(() => setStorageError("We could not save to this browser. Export a backup now — storage may be full or blocked."));
  }, [workspace, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    revisionQueue.current = revisionQueue.current.then(() => saveRevisions(revisions)).catch(() => undefined);
  }, [revisions, hydrated]);

  const commitWorkspace = useCallback((next: Workspace) => {
    workspaceRef.current = next;
    setWorkspace(next);
  }, []);

  const commitRevisions = useCallback((next: Record<string, Plan[]>) => {
    revisionsRef.current = next;
    setRevisions(next);
  }, []);

  const updatePlan = useCallback((updater: (current: Plan) => Plan) => {
    const active = workspaceRef.current.plans.find((item) => item.id === workspaceRef.current.activePlanId);
    if (!active) return;
    const next = updater(active);
    if (next === active) return;
    const history = addRevision(revisionsRef.current, active);
    commitRevisions(history);
    commitWorkspace({
      ...workspaceRef.current,
      plans: workspaceRef.current.plans.map((item) => (item.id === active.id ? next : item)),
    });
  }, [commitRevisions, commitWorkspace]);

  const createPlan = useCallback((brief: Brief) => {
    const created = buildPlan(brief);
    const nextRevisions = { ...revisionsRef.current, [created.id]: [] };
    commitRevisions(nextRevisions);
    commitWorkspace({
      ...workspaceRef.current,
      activePlanId: created.id,
      plans: [...workspaceRef.current.plans, created],
    });
    return created;
  }, [commitRevisions, commitWorkspace]);

  const updateBrief = useCallback((brief: Brief) => {
    const active = workspaceRef.current.plans.find((item) => item.id === workspaceRef.current.activePlanId);
    if (!active) return null;
    const next = rebuildPlan(active, brief);
    const history = addRevision(revisionsRef.current, active);
    commitRevisions(history);
    commitWorkspace({
      ...workspaceRef.current,
      plans: workspaceRef.current.plans.map((item) => (item.id === active.id ? next : item)),
    });
    return next;
  }, [commitRevisions, commitWorkspace]);

  const switchPlan = useCallback((id: string) => {
    if (!workspaceRef.current.plans.some((item) => item.id === id)) return;
    commitWorkspace({ ...workspaceRef.current, activePlanId: id });
  }, [commitWorkspace]);

  const duplicatePlan = useCallback((id: string) => {
    const source = workspaceRef.current.plans.find((item) => item.id === id);
    if (!source) return null;
    const copy: Plan = {
      ...structuredClone(source),
      id: globalThis.crypto?.randomUUID?.() ?? `plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      archivedAt: null,
      rsvpShare: null,
      brief: { ...source.brief, title: `${source.brief.title} (copy)` },
    };
    const nextRevisions = { ...revisionsRef.current, [copy.id]: [] };
    commitRevisions(nextRevisions);
    commitWorkspace({
      ...workspaceRef.current,
      activePlanId: copy.id,
      plans: [...workspaceRef.current.plans, copy],
    });
    return copy;
  }, [commitRevisions, commitWorkspace]);

  const archivePlan = useCallback((id: string, archived = true) => {
    const current = workspaceRef.current;
    const plans = current.plans.map((item) => item.id === id ? { ...item, archivedAt: archived ? new Date().toISOString() : null } : item);
    let activePlanId = current.activePlanId;
    if (archived && activePlanId === id) {
      // Keep the archived plan open if it is the only one; the switcher can restore it.
      activePlanId = plans.find((item) => !item.archivedAt && item.id !== id)?.id ?? id;
    } else if (!archived) {
      activePlanId = id;
    }
    commitWorkspace({ ...current, plans, activePlanId });
  }, [commitWorkspace]);

  const deletePlan = useCallback((id: string) => {
    const current = workspaceRef.current;
    const plans = current.plans.filter((item) => item.id !== id);
    const activePlanId = current.activePlanId === id
      ? plans.find((item) => !item.archivedAt)?.id ?? plans[0]?.id ?? null
      : current.activePlanId;
    const nextRevisions = { ...revisionsRef.current };
    delete nextRevisions[id];
    commitRevisions(nextRevisions);
    commitWorkspace({ ...current, plans, activePlanId });
  }, [commitRevisions, commitWorkspace]);

  const resetPlan = useCallback(() => {
    const activeId = workspaceRef.current.activePlanId;
    if (activeId) deletePlan(activeId);
    else commitWorkspace(emptyWorkspace());
  }, [commitWorkspace, deletePlan]);

  const importBackup = useCallback((backup: PlanBackup, mode: "merge" | "replace") => {
    const incoming = backup.workspace;
    if (mode === "replace") {
      commitRevisions({});
      commitWorkspace({
        version: 1,
        activePlanId: incoming.activePlanId ?? incoming.plans[0]?.id ?? null,
        plans: incoming.plans,
      });
      return;
    }
    const existing = workspaceRef.current;
    const byId = new Map(existing.plans.map((item) => [item.id, item]));
    for (const plan of incoming.plans) byId.set(plan.id, plan);
    const plans = [...byId.values()];
    commitWorkspace({
      version: 1,
      activePlanId: incoming.activePlanId ?? existing.activePlanId ?? plans[0]?.id ?? null,
      plans,
    });
  }, [commitWorkspace, commitRevisions]);

  const createBackup = useCallback((): PlanBackup => ({
    app: "eventas",
    kind: "backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: workspaceRef.current,
  }), []);

  const undo = useCallback(() => {
    const activeId = workspaceRef.current.activePlanId;
    if (!activeId) return;
    const stack = [...(revisionsRef.current[activeId] ?? [])];
    const previous = stack.pop();
    if (!previous) return;
    commitRevisions({ ...revisionsRef.current, [activeId]: stack });
    commitWorkspace({
      ...workspaceRef.current,
      plans: workspaceRef.current.plans.map((item) => (item.id === activeId ? previous : item)),
    });
  }, [commitRevisions, commitWorkspace]);

  const enrichWithAi = useCallback(async (source: Plan) => {
    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: source, language }),
      });
      if (!response.ok) return;
      const data: unknown = await response.json();
      const result = aiPlanResponseSchema.safeParse(data);
      if (!result.success || workspaceRef.current.activePlanId !== source.id) return;
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

  const canUndo = Boolean(workspace.activePlanId && (revisions[workspace.activePlanId]?.length ?? 0) > 0);

  const value = useMemo(() => ({
    plan,
    plans: workspace.plans,
    activePlanId: workspace.activePlanId,
    hydrated,
    storageError,
    createPlan,
    updatePlan,
    updateBrief,
    switchPlan,
    duplicatePlan,
    archivePlan,
    deletePlan,
    importBackup,
    createBackup,
    undo,
    canUndo,
    resetPlan,
    enrichWithAi,
  }), [plan, workspace.plans, workspace.activePlanId, hydrated, storageError, createPlan, updatePlan, updateBrief, switchPlan, duplicatePlan, archivePlan, deletePlan, importBackup, createBackup, undo, canUndo, resetPlan, enrichWithAi]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan must be used inside PlanProvider");
  return context;
}
