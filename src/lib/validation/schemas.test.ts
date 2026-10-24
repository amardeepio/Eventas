import { describe, expect, it } from "vitest";
import { aiPlanResponseSchema, assistantRequestSchema, briefSchema, planSchema } from "./schemas";
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
    expect(planSchema.safeParse({ ...plan, version: 2 }).success).toBe(false);
  });

  it("caps assistant history", () => {
    const plan = buildPlan(getSampleBrief("community"));
    const tooMany = Array.from({ length: 21 }, (_, index) => ({ role: "user" as const, content: `Question ${index}` }));
    expect(assistantRequestSchema.safeParse({ plan, messages: tooMany }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ plan, messages: [{ role: "system", content: "hi" }] }).success).toBe(false);
  });
});
