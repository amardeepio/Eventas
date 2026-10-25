import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { clearTranslateCache, translateTexts } from "./server";

function mockTranslate(prefix = "अनुवाद") {
  const calls: string[][] = [];
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { q: string[]; target: string };
    calls.push(body.q);
    return Response.json({
      data: { translations: body.q.map((text) => ({ translatedText: `${prefix}:${text}&#39;s` })) },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

describe("Google Translate provider", () => {
  beforeEach(() => {
    clearTranslateCache();
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("dedupes strings, decodes entities, and caches per language", async () => {
    const calls = mockTranslate();
    const first = await translateTexts(["Budget", "Budget", "42"], "hi");
    expect(first[0]).toBe("अनुवाद:Budget's");
    expect(first[1]).toBe("अनुवाद:Budget's");
    expect(first[2]).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(["Budget"]);

    await translateTexts(["Budget"], "hi");
    expect(calls).toHaveLength(1);

    await translateTexts(["Budget"], "ta");
    expect(calls).toHaveLength(2);
  });

  it("batches large payloads instead of sending one huge request", async () => {
    const calls = mockTranslate();
    const texts = Array.from({ length: 120 }, (_, index) => `Sentence ${index}`);
    const result = await translateTexts(texts, "bn");
    expect(result.filter(Boolean)).toHaveLength(120);
    expect(calls.length).toBeGreaterThan(2);
    expect(calls.every((batch) => batch.length <= 50)).toBe(true);
  });

  it("returns nulls instead of throwing when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect(await translateTexts(["Hello"], "mr")).toEqual([null]);

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    clearTranslateCache();
    expect(await translateTexts(["Hello"], "mr")).toEqual([null]);
  });

  it("does no network work without a key or for the source language", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
    expect(await translateTexts(["Hello"], "gu")).toEqual([null]);
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    expect(await translateTexts(["Hello"], "en")).toEqual([null]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops spending once the daily character budget is exhausted", async () => {
    vi.stubEnv("TRANSLATE_DAILY_CHAR_LIMIT", "10");
    const calls = mockTranslate();
    expect(await translateTexts(["A much longer sentence"], "hi")).toEqual([null]);
    expect(calls).toHaveLength(0);

    expect(await translateTexts(["Short"], "hi")).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });
});
