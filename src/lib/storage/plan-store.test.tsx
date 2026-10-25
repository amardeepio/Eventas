import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanProvider, usePlan } from "./plan-store";
import { getSampleBrief } from "../domain/packs";
import { buildPlan } from "../domain/engine/plan";

function wrapper({ children }: { children: React.ReactNode }) {
  return <PlanProvider>{children}</PlanProvider>;
}

describe("local plan store", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("creates, persists, updates, and resets a plan", async () => {
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => { result.current.createPlan(getSampleBrief("wedding")); });
    expect(result.current.plan?.brief.eventType).toBe("wedding");
    await waitFor(() => expect(localStorage.getItem("eventas.plan.v2")).toContain("Maya"));

    act(() => {
      result.current.updatePlan((current) => ({ ...current, brief: { ...current.brief, guests: 80 } }));
    });
    expect(result.current.plan?.brief.guests).toBe(80);

    act(() => { result.current.resetPlan(); });
    expect(result.current.plan).toBeNull();
    await waitFor(() => expect(localStorage.getItem("eventas.plan.v2")).toBeNull());
  });

  it("migrates a v1 plan without losing its brief or budget", async () => {
    const legacyPlan = buildPlan(getSampleBrief("wedding"));
    const legacy = {
      ...legacyPlan,
      version: 1,
      brief: { ...legacyPlan.brief, tradition: undefined, functions: undefined, muhurat: undefined },
      functions: undefined,
      muhurat: undefined,
      budget: legacyPlan.budget.map((item) => { const { scaling, ...rest } = item; void scaling; return rest; }),
    };
    localStorage.setItem("eventas.plan.v1", JSON.stringify(legacy));
    const { result } = renderHook(() => usePlan(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.plan?.version).toBe(2);
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
