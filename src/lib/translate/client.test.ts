import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTranslationCache, fetchTranslations, getCached, primeTranslations } from "./client";

describe("translation client cache", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTranslationCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("stores translations in memory and localStorage", () => {
    primeTranslations("hi", { "Save the date": "तारीख सहेजें", "": "ignored" });
    expect(getCached("hi", "Save the date")).toBe("तारीख सहेजें");
    const stored = JSON.parse(localStorage.getItem("eventas.translations.v1") ?? "{}") as Record<string, Record<string, string>>;
    expect(stored.hi?.["Save the date"]).toBe("तारीख सहेजें");
    expect(getCached("ta", "Save the date")).toBeUndefined();
  });

  it("only asks the server for strings that are not cached", async () => {
    primeTranslations("ta", { Hello: "வணக்கம்" });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("/api/translate");
      expect(init?.method).toBe("POST");
      return Response.json({ translations: ["புதிய"] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTranslations("ta", ["Hello", "New"]);
    expect(result).toEqual({ Hello: "வணக்கம்", New: "புதிய" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { texts: string[]; target: string };
    expect(body.target).toBe("ta");
    expect(body.texts).toEqual(["New"]);
    expect(getCached("ta", "New")).toBe("புதிய");
  });

  it("skips numeric or symbolic strings entirely", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchTranslations("mr", ["₹40,00,000", "42", "—"])).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("degrades quietly when the endpoint fails or returns junk", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    expect(await fetchTranslations("bn", ["Hello"])).toEqual({});

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await fetchTranslations("gu", ["Hello"])).toEqual({});

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ translations: "nope" })));
    expect(await fetchTranslations("kn", ["Hello"])).toEqual({});
  });
});
