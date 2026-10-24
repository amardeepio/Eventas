import { describe, expect, it } from "vitest";
import { formatIndianCity, INDIAN_CITIES, searchIndianCities } from "./indian-cities";

describe("Indian city autocomplete", () => {
  it("defaults to New Delhi first", () => {
    expect(INDIAN_CITIES[0]).toEqual({ city: "New Delhi", state: "Delhi" });
    expect(formatIndianCity(INDIAN_CITIES[0]!)).toBe("New Delhi, Delhi");
  });

  it("prioritises city prefix matches and searches state names", () => {
    expect(searchIndianCities("mum")[0]?.city).toBe("Mumbai");
    expect(searchIndianCities("kerala").map((item) => item.city)).toContain("Kochi");
    expect(searchIndianCities("jaip")[0]?.city).toBe("Jaipur");
  });

  it("returns bounded suggestions and handles no matches", () => {
    expect(searchIndianCities("a", 6)).toHaveLength(6);
    expect(searchIndianCities("not-an-indian-city")).toEqual([]);
  });

  it("contains Indian states only", () => {
    expect(INDIAN_CITIES.every((item) => item.state.length > 1)).toBe(true);
    expect(INDIAN_CITIES.some((item) => item.city === "Austin")).toBe(false);
  });
});
