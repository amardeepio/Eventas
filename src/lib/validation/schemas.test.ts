import { describe, expect, it } from "vitest";
import { aiPlanResponseSchema, assistantRequestSchema, briefSchema, planSchema, weddingDraftSchema } from "./schemas";
import { getSampleBrief } from "../domain/packs";
import { buildPlan } from "../domain/engine/plan";

describe("brief validation", () => {
  it("accepts a coherent brief", () => {
    expect(briefSchema.safeParse(getSampleBrief("wedding")).success).toBe(true);
  });

  it("rejects unknown event types, missing priorities, and oversized notes", () => {
    const base = getSampleBrief("wedding");
    expect(briefSchema.safeParse({ ...base, eventType: "conference" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, priorities: [] }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, notes: "x".repeat(1201) }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, guests: 0 }).success).toBe(false);
  });

  it("rejects unknown keys on AI output instead of trusting the model", () => {
    const result = aiPlanResponseSchema.safeParse({ headline: "H", insights: ["a", "b"], ideas: [], extra: true });
    expect(result.success).toBe(false);
  });

  it("round-trips a complete plan through persistence validation", () => {
    const plan = buildPlan(getSampleBrief("birthday"));
    expect(planSchema.safeParse(plan).success).toBe(true);
    expect(planSchema.safeParse({ ...plan, version: 4 }).success).toBe(false);
  });

  it("caps assistant history", () => {
    const plan = buildPlan(getSampleBrief("community"));
    const tooMany = Array.from({ length: 21 }, (_, index) => ({ role: "user" as const, content: `Question ${index}` }));
    expect(assistantRequestSchema.safeParse({ plan, messages: tooMany }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ plan, messages: [{ role: "system", content: "hi" }] }).success).toBe(false);
  });

  it("accepts multi-day functions and a muhurat in a v3 plan", () => {
    const plan = buildPlan(getSampleBrief("wedding"));
    expect(plan.version).toBe(3);
    expect(plan.functions.length).toBeGreaterThan(1);
    expect(plan.brief.functions).toHaveLength(plan.functions.length);
    expect(plan.brief.tradition).toBe("north-hindu");
  });

  it("rejects unknown keys and invalid function kinds in a wedding draft", () => {
    const base = {
      tradition: "north-hindu",
      date: "2026-11-21",
      guests: 300,
      budget: 4_000_000,
      location: "Udaipur, Rajasthan",
      functions: [],
    };
    expect(weddingDraftSchema.safeParse(base).success).toBe(true);
    expect(weddingDraftSchema.safeParse({ ...base, extra: true }).success).toBe(false);
    expect(weddingDraftSchema.safeParse({ ...base, functions: [{ kind: "brunch" }] }).success).toBe(false);
  });
});
