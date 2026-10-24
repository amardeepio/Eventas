import { describe, expect, it } from "vitest";
import { POST as planRoute } from "./ai/plan/route";
import { POST as rebalanceRoute } from "./ai/rebalance/route";
import { POST as assistantRoute } from "./assistant/route";
import { buildPlan } from "@/lib/domain/engine/plan";
import { getSampleBrief } from "@/lib/domain/packs";

const plan = buildPlan(getSampleBrief("wedding", new Date("2026-10-24T00:00:00Z")), new Date("2026-10-24T00:00:00Z"));
let ip = 0;
function request(body: unknown): Request {
  ip += 1;
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${ip}` },
    body: JSON.stringify(body),
  });
}

describe("AI route contracts", () => {
  it("returns a complete demo plan without a key", async () => {
    const response = await planRoute(request({ plan }));
    expect(response.status).toBe(200);
    const data = await response.json() as { mode: string; insights: string[]; ideas: unknown[] };
    expect(data.mode).toBe("demo");
    expect(data.insights).toHaveLength(3);
    expect(data.ideas).toHaveLength(6);
  });

  it("rejects malformed payloads with a safe 400", async () => {
    const response = await planRoute(request({ plan: { nope: true } }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Please check the plan details and try again." });
  });

  it("validates that a rebalance remains safe", async () => {
    const response = await rebalanceRoute(request({ plan, goal: "save 10%" }));
    expect(response.status).toBe(200);
    const data = await response.json() as { allocation: Record<string, number>; rationale: string };
    const total = Object.values(data.allocation).reduce((sum, value) => sum + value, 0);
    expect(total).toBeLessThanOrEqual(plan.brief.budget);
    expect(data.rationale.length).toBeGreaterThan(20);
  });

  it("streams a contextual demo answer when AI is unavailable", async () => {
    const response = await assistantRoute(request({ plan, messages: [{ role: "user", content: "What is next?" }] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Eventas-Mode")).toBe("demo");
    expect(await response.text()).toContain("next three moves");
  });

  it("rate limits abusive clients", async () => {
    const results: number[] = [];
    for (let index = 0; index < 15; index += 1) {
      const response = await planRoute(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify({ plan }) }));
      results.push(response.status);
    }
    expect(results).toContain(429);
  });
});
