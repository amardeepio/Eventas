import { describe, expect, it } from "vitest";
import { cityTier, cityTierLabel, inferCostLevel, isDestinationCity } from "./city-tiers";
import {
  MUHURAT_CAVEAT,
  findMuhuratSuggestion,
  formatMuhuratTime,
  muhuratInMonth,
  muhuratPromptTable,
  traditionUsesMuhurat,
} from "./muhurat";
import { getTradition, TRADITION_OPTIONS, traditionFunctionKinds } from "./traditions";

describe("city tiers", () => {
  it("classifies metro, tier-2, tier-3, and destination cities", () => {
    expect(cityTier("Mumbai, Maharashtra")).toBe("metro");
    expect(cityTier("Indore, Madhya Pradesh")).toBe("tier2");
    expect(cityTier("Somewhere, Nowhere")).toBe("tier3");
    expect(cityTier("Udaipur, Rajasthan")).toBe("destination");
    expect(isDestinationCity("Goa")).toBe(true);
    expect(isDestinationCity("Mumbai")).toBe(false);
  });

  it("maps tiers to a starting cost level and a readable label", () => {
    expect(inferCostLevel("Mumbai, Maharashtra")).toBe("high");
    expect(inferCostLevel("Indore, Madhya Pradesh")).toBe("average");
    expect(inferCostLevel("Somewhere, Nowhere")).toBe("low");
    expect(cityTierLabel("Udaipur, Rajasthan")).toMatch(/destination/i);
    expect(cityTierLabel("Indore, Madhya Pradesh")).toMatch(/tier-2/i);
    expect(cityTierLabel("Somewhere, Nowhere")).toMatch(/tier-3/i);
  });
});

describe("muhurat helpers", () => {
  it("lists curated dates by month and formats windows", () => {
    expect(muhuratInMonth(2026, 11)).toHaveLength(4);
    expect(muhuratInMonth(2026, 10)).toHaveLength(0);
    expect(formatMuhuratTime({ date: "2026-11-21", start: "06:48", end: "23:59", label: "Vivah", source: "Test" })).toBe("06:48 – 23:59");
    expect(formatMuhuratTime({ date: "2026-11-24", start: "", end: "", label: "Vivah", source: "Test" })).toMatch(/confirm/i);
    expect(formatMuhuratTime({ date: "2026-11-24", start: "09:00", end: "", label: "Vivah", source: "Test" })).toBe("09:00");
    expect(muhuratPromptTable()).toContain("2026-11-21");
    expect(MUHURAT_CAVEAT).toMatch(/pandit/i);
  });

  it("only enables muhurat defaults for traditions that use them", () => {
    expect(traditionUsesMuhurat("north-hindu")).toBe(true);
    expect(traditionUsesMuhurat("muslim")).toBe(false);
    expect(findMuhuratSuggestion("2026-11-21")?.label).toMatch(/muhurat/i);
    expect(findMuhuratSuggestion("2026-11-22")).toBeNull();
  });
});

describe("tradition profiles", () => {
  it("publishes a complete profile for every tradition", () => {
    for (const profile of TRADITION_OPTIONS) {
      expect(profile.functions.length).toBeGreaterThan(0);
      expect(profile.ceremonyLabel.length).toBeGreaterThan(0);
      expect(profile.ritualLead.length).toBeGreaterThan(0);
    }
    expect(getTradition(undefined).id).toBe("none");
    expect(traditionFunctionKinds("muslim")).toContain("ceremony");
    expect(traditionFunctionKinds("christian")).toEqual(["ceremony", "reception"]);
  });
});
