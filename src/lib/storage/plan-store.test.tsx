import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanProvider, usePlan } from "./plan-store";
import { LanguageProvider } from "../i18n/language-provider";
import { getSampleBrief } from "../domain/packs";
import { buildPlan } from "../domain/engine/plan";
import { resetStorageForTests, storageDelete } from "./db";
import { loadWorkspace, REVISIONS_KEY, WORKSPACE_KEY } from "./workspace";

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider><PlanProvider>{children}</PlanProvider></LanguageProvider>;
}

describe("local plan store", () => {
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    await storageDelete(WORKSPACE_KEY);
    await storageDelete(REVISIONS_KEY);
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await resetStorageForTests();
    vi.unstubAllGlobals();
  });

  it("creates, persists, updates, and resets a plan", async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => { result.current.createPlan(getSampleBrief("wedding")); });
    expect(result.current.plan?.brief.eventType).toBe("wedding");
    await waitFor(async () => {
      const stored = await loadWorkspace();
      expect(stored.plans[0]?.brief.title).toContain("Maya");
    });

    act(() => {
      result.current.updatePlan((current) => ({ ...current, brief: { ...current.brief, guests: 80 } }));
    });
    expect(result.current.plan?.brief.guests).toBe(80);

    act(() => { result.current.resetPlan(); });
    expect(result.current.plan).toBeNull();
    await waitFor(async () => expect((await loadWorkspace()).plans).toHaveLength(0));
  });

  it("undoes the last plan change and restores the previous snapshot", async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => { result.current.createPlan(getSampleBrief("birthday")); });
    const originalGuests = result.current.plan?.brief.guests;
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.updatePlan((current) => ({ ...current, brief: { ...current.brief, guests: 80 } }));
    });
    expect(result.current.plan?.brief.guests).toBe(80);
    expect(result.current.canUndo).toBe(true);

    act(() => { result.current.undo(); });
    expect(result.current.plan?.brief.guests).toBe(originalGuests);
    expect(result.current.canUndo).toBe(false);
  });

  it("keeps undo available after a reload", async () => {
    const first = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    act(() => { first.result.current.createPlan(getSampleBrief("birthday")); });
    const original = first.result.current.plan?.brief.guests;
    act(() => { first.result.current.updatePlan((current) => ({ ...current, brief: { ...current.brief, guests: 80 } })); });
    await waitFor(async () => expect((await loadWorkspace()).plans[0]?.brief.guests).toBe(80));
    first.unmount();

    const second = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(second.result.current.hydrated).toBe(true));
    expect(second.result.current.plan?.brief.guests).toBe(80);
    expect(second.result.current.canUndo).toBe(true);
    act(() => { second.result.current.undo(); });
    expect(second.result.current.plan?.brief.guests).toBe(original);
  });

  it("archives, switches, duplicates, and deletes plans", async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => { result.current.createPlan(getSampleBrief("wedding")); });
    const first = result.current.plan?.id;
    if (!first) throw new Error("plan not created");
    act(() => { result.current.createPlan(getSampleBrief("birthday")); });
    expect(result.current.plans).toHaveLength(2);
    const second = result.current.activePlanId;

    act(() => { result.current.switchPlan(first); });
    expect(result.current.plan?.brief.eventType).toBe("wedding");
    act(() => { result.current.duplicatePlan(first); });
    expect(result.current.plan?.brief.title).toContain("(copy)");
    expect(result.current.plans).toHaveLength(3);

    const copy = result.current.activePlanId;
    if (!copy) throw new Error("copy not created");
    act(() => { result.current.archivePlan(copy); });
    expect(result.current.plan?.id).not.toBe(copy);
    act(() => { result.current.archivePlan(copy, false); });
    expect(result.current.plan?.id).toBe(copy);
    act(() => { result.current.deletePlan(second as string); });
    expect(result.current.plans).toHaveLength(2);
  });

  it("rebuilds a brief without discarding edits, custom items, and guests", async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => { result.current.createPlan(getSampleBrief("wedding")); });
    const task = result.current.plan?.timeline[0];
    if (!task) throw new Error("missing task");
    act(() => {
      result.current.updatePlan((current) => ({
        ...current,
        timeline: current.timeline.map((item) => item.id === task.id ? { ...item, title: "Our edited task", edited: true } : item),
        budget: [...current.budget, {
          id: "custom-1", name: "NRI paperwork", recommended: 50_000, planned: 50_000, actual: 10_000,
          color: "#123456", description: "Custom line", perGuest: false, scaling: "fixed", source: "custom", plannedEdited: true,
        }],
        guests: [{
          id: "guest-1", name: "Asha", side: "bride", relationship: "Aunt", phone: "", email: "", city: "",
          dietary: ["Jain"], notes: "", invites: current.functions.map((item) => ({ functionId: item.id, status: "yes", seats: 2 })),
          travel: { arriving: "", departing: "", needsPickup: false, needsHotel: false, roomPreference: "" },
        }],
      }));
    });

    act(() => {
      result.current.updateBrief({ ...result.current.plan!.brief, guests: 120 });
    });
    expect(result.current.plan?.brief.guests).toBe(120);
    expect(result.current.plan?.timeline.find((item) => item.id === task.id)?.title).toBe("Our edited task");
    expect(result.current.plan?.budget.find((item) => item.id === "custom-1")?.actual).toBe(10_000);
    expect(result.current.plan?.guests[0]?.name).toBe("Asha");
  });

  it("migrates a v1 plan without losing its brief or budget", async () => {
    await storageDelete(WORKSPACE_KEY);
    await storageDelete(REVISIONS_KEY);
    const legacyPlan = buildPlan(getSampleBrief("wedding"));
    const legacy = {
      ...legacyPlan,
      version: 1,
      brief: { ...legacyPlan.brief, tradition: undefined, functions: undefined, muhurat: undefined },
      functions: undefined,
      muhurat: undefined,
      budget: legacyPlan.budget.map((item) => { const { scaling, source, plannedEdited, ...rest } = item; void scaling; void source; void plannedEdited; return rest; }),
    };
    localStorage.setItem("eventas.plan.v1", JSON.stringify(legacy));
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.plan?.version).toBe(3);
    expect(result.current.plan?.brief.title).toBe(legacyPlan.brief.title);
    expect(result.current.plan?.functions.length).toBeGreaterThan(0);
    expect(result.current.plan?.budget.every((item) => Boolean(item.scaling))).toBe(true);
    expect(localStorage.getItem("eventas.plan.v1")).toBeNull();
  });

  it("enriches a plan and ignores malformed model responses", async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => { result.current.createPlan(getSampleBrief("birthday")); });
    const created = result.current.plan;
    if (!created) throw new Error("plan not created");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      headline: "A sharper headline", insights: ["One", "Two"], mode: "live",
      ideas: created.ideas.map(({ kind, title, description, cost, tags }) => ({ kind, title, description, cost, tags })),
    }), { status: 200 })));
    await act(async () => { await result.current.enrichWithAi(created); });
    expect(result.current.plan?.ai.headline).toBe("A sharper headline");
    expect(result.current.plan?.ai.mode).toBe("live");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ headline: "bad" }), { status: 200 })));
    await act(async () => { await result.current.enrichWithAi(created); });
    expect(result.current.plan?.ai.headline).toBe("A sharper headline");
  });
});
