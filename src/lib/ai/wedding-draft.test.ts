import { describe, expect, it } from "vitest";
import { demoDraftMessage, demoWeddingDraft } from "./demo";
import { normalizeWeddingDraft } from "./wedding-draft";
import { weddingDraftSchema, briefSchema } from "../validation/schemas";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";

const now = new Date("2026-10-24T12:00:00Z");

describe("demo wedding draft", () => {
  it("extracts a Punjabi wedding brief from one sentence", () => {
    const result = demoWeddingDraft("Punjabi wedding in Chandigarh, 350 guests, ₹45 lakh, November 2026, with mehndi and sangeet.", now);
    expect(result.brief.tradition).toBe("punjabi-sikh");
    expect(result.brief.guests).toBe(350);
    expect(result.brief.budget).toBe(4_500_000);
    expect(result.brief.location).toContain("Chandigarh");
    expect(result.brief.functions.some((item) => item.kind === "sangeet")).toBe(true);
    expect(result.brief.muhurat).toBeUndefined();
    expect(briefSchema.safeParse(result.brief).success).toBe(true);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("uses the curated muhurat for a South Indian muhurtham", () => {
    const result = demoWeddingDraft("South Indian morning muhurtham in Chennai, 200 guests, ₹25 lakh, 2026-11-21.", now);
    expect(result.brief.tradition).toBe("south-indian");
    expect(result.brief.muhurat?.date).toBe("2026-11-21");
    expect(result.brief.functions.map((item) => item.kind)).toContain("ceremony");
    expect(briefSchema.safeParse(result.brief).success).toBe(true);
  });

  it("asks at most three useful follow-up questions", () => {
    const result = demoWeddingDraft("We want a wedding.", now);
    expect(result.questions.length).toBeLessThanOrEqual(3);
    expect(result.questions.length).toBeGreaterThan(0);
  });
});

describe("wedding draft normalization", () => {
  it("clamps numbers, filters priorities, and keeps muhurat aligned to the date", () => {
    const parsed = weddingDraftSchema.parse({
      tradition: "north-hindu",
      date: "2026-11-21",
      guests: 300,
      budget: 4_000_000,
      location: "Udaipur, Rajasthan",
      priorities: ["catering", "not-a-category", "photo"],
      vibe: "royal",
      constraints: ["Budget 45 lakh", "Vegetarian/Langar menu", "Guest count 350", "Step-free access"],
      functions: [{ kind: "sangeet", name: "Sangeet night" }],
      muhurat: { date: "2026-11-25", start: "10:00", end: "11:00", label: "Mismatch", source: "Test" },
    });
    const result = normalizeWeddingDraft({ ...parsed, guests: 500_000, budget: 1 }, now);
    expect(result.brief.guests).toBe(100_000);
    expect(result.brief.budget).toBe(100);
    expect(result.brief.priorities).toEqual(["catering", "photo"]);
    expect(result.brief.constraints).toEqual(["Vegetarian/Langar menu", "Step-free access"]);
    expect(result.brief.functions).toHaveLength(1);
    expect(result.brief.muhurat?.date).toBe("2026-11-21");
    expect(result.assumptions.join(" ")).toMatch(/muhurat|budget|guests/i);
  });

  it("never adds a muhurat for a tradition that does not use one", () => {
    const parsed = weddingDraftSchema.parse({
      tradition: "christian",
      date: "2026-11-21",
      guests: 120,
      budget: 2_500_000,
      location: "Kochi, Kerala",
      vibe: "traditional",
      muhurat: { date: "2026-11-21", start: "", end: "", label: "Test", source: "Test" },
    });
    const result = normalizeWeddingDraft(parsed, now);
    expect(result.brief.muhurat).toBeUndefined();
  });

  it("normalizes model-side labels instead of rejecting the draft", () => {
    const parsed = weddingDraftSchema.parse({
      tradition: "north-hindu",
      date: "2026-11-21",
      guests: 250,
      budget: 3_000_000,
      location: "Delhi, Delhi",
      vibe: "traditional",
      functions: [
        { kind: "mehndi", hostSide: "Bride's side" },
        { kind: "sangeet", hostSide: "Groom side" },
        { kind: "ceremony", hostSide: "both families" },
      ],
    });
    const result = normalizeWeddingDraft(parsed, now);
    expect(result.brief.functions.map((item) => item.hostSide)).toEqual(["bride", "groom", "both"]);
  });
});

describe("demo vendor message", () => {
  it("mentions the category, functions, and GST without inventing a business", () => {
    const plan = buildPlan(getSampleBrief("wedding", now), now);
    const vendor = plan.vendors.find((item) => item.id === "caterer");
    if (!vendor) throw new Error("caterer missing");
    const body = demoDraftMessage(plan, vendor);
    expect(body).toContain("Caterer");
    expect(body).toContain("GST");
    expect(body).toContain(plan.brief.hostNames);
    expect(body.length).toBeLessThan(1400);
  });
});
