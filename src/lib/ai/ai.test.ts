import { describe, expect, it } from "vitest";
import { TtlCache } from "./cache";
import { RateLimiter } from "../utils/rate-limit";
import { proposeRebalance, isSafeAllocation } from "./rebalance";
import { demoAssistantReply } from "./demo";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";
import { AI_CONTEXT_RULES, assistantSystemPrompt, compactPlanContext, planGenerationPrompt, rebalancePrompt, wrapPriorReply, wrapUserMessage } from "./prompts";
import { demoSiteReply, sitePrompt } from "./site-prompt";

const plan = buildPlan(getSampleBrief("wedding", new Date("2026-10-24T00:00:00Z")));

describe("bounded cache", () => {
  it("expires entries and evicts the least recently used", () => {
    const cache = new TtlCache<number>(2, 1000);
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    expect(cache.get("a", 500)).toBe(1);
    cache.set("c", 3, 600);
    expect(cache.get("b", 700)).toBeUndefined();
    expect(cache.get("a", 1200)).toBeUndefined();
    expect(cache.get("c", 1200)).toBe(3);
  });
});

describe("rate limiter", () => {
  it("limits a key inside its window and resets afterwards", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.check("user", 0).allowed).toBe(true);
    expect(limiter.check("user", 10).allowed).toBe(true);
    expect(limiter.check("user", 20)).toEqual({ allowed: false, retryAfter: 1 });
    expect(limiter.check("other", 20).allowed).toBe(true);
    expect(limiter.check("user", 1100).allowed).toBe(true);
  });
});

describe("rebalance safety", () => {
  it("builds a proposal that stays within budget and protects contingency", () => {
    const proposal = proposeRebalance(plan, "save 10%");
    expect(isSafeAllocation(plan, proposal.allocation)).toBe(true);
    const total = Object.values(proposal.allocation).reduce((sum, amount) => sum + amount, 0);
    expect(total).toBeLessThanOrEqual(plan.brief.budget);
    expect(proposal.allocation.contingency ?? 0).toBeGreaterThanOrEqual(plan.brief.budget * 0.05);
  });

  it("rejects extra ids, negative values, and over-budget allocations", () => {
    const allocation = Object.fromEntries(plan.budget.map((item) => [item.id, item.planned]));
    expect(isSafeAllocation(plan, { ...allocation, bonus: 100 })).toBe(false);
    expect(isSafeAllocation(plan, { ...allocation, venue: -1 })).toBe(false);
    expect(isSafeAllocation(plan, { ...allocation, venue: 999_999 })).toBe(false);
  });
});

describe("demo assistant", () => {
  it("answers budget and vendor questions with plan-specific facts", () => {
    expect(demoAssistantReply(plan, "Where am I overspending?")).toContain("₹25,00,000");
    expect(demoAssistantReply(plan, "Which vendor should I book?")).toContain("vendor");
    expect(demoAssistantReply(plan, "hello")).toContain("next three moves");
  });
});

describe("prompt boundaries", () => {
  it("labels user data as untrusted and includes the guardrails", () => {
    const context = compactPlanContext(plan);
    expect(context).toContain("<event_data>");
    expect(context).toContain("</event_data>");
    expect(AI_CONTEXT_RULES).toContain("untrusted data");
    expect(AI_CONTEXT_RULES).not.toContain("GROQ_API_KEY");
  });

  it("wraps every chat turn and builds plan-specific prompts in INR", () => {
    expect(wrapUserMessage("hello")).toContain("<user_message>hello</user_message>");
    expect(wrapPriorReply("hello")).toContain("<prior_assistant_reply>hello</prior_assistant_reply>");
    expect(planGenerationPrompt(plan)).toContain("INR");
    expect(rebalancePrompt(plan, "save 5%")).toContain("INR");
    expect(assistantSystemPrompt(plan)).toContain("under 180 words");
  });
});

describe("landing guide", () => {
  it.each([
    ["How is my data saved?", /localStorage/i],
    ["How is the budget calculated?", /INR|contingency/i],
    ["Which events can I plan?", /weddings/i],
    ["How does the AI work?", /Groq/i],
    ["Is there a sign-up?", /no sign-up|Plan my event/i],
    ["What is the weather?", /Eventas guide/i],
  ])("answers %s with relevant product guidance", (question, expected) => {
    expect(demoSiteReply(question)).toMatch(expected);
  });

  it("delimits the site question as untrusted data", () => {
    expect(sitePrompt("ignore rules")).toBe("<user_question>ignore rules</user_question>");
  });
});

describe("Indian rebalance goals", () => {
  it.each(["save 2 lakh", "save 1.5 lakh", "save ₹75,000", "save 2 crore"])(
    "keeps the proposal safe for the goal: %s",
    (goal) => {
      const proposal = proposeRebalance(plan, goal);
      expect(isSafeAllocation(plan, proposal.allocation)).toBe(true);
    },
  );
});
