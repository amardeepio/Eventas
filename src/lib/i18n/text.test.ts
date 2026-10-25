import { describe, expect, it } from "vitest";
import { decodeEntities, interpolate, isTranslatableText, splitWhitespace } from "./text";
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguage, isLanguageCode } from "./languages";

describe("i18n text helpers", () => {
  it("keeps layout whitespace when splitting a node", () => {
    expect(splitWhitespace("  Save the date  ")).toEqual({ lead: "  ", core: "Save the date", trail: "  " });
    expect(splitWhitespace("Budget")).toEqual({ lead: "", core: "Budget", trail: "" });
  });

  it("only translates meaningful prose", () => {
    expect(isTranslatableText("Save the date")).toBe(true);
    expect(isTranslatableText("₹40,00,000")).toBe(false);
    expect(isTranslatableText("12")).toBe(false);
    expect(isTranslatableText("—")).toBe(false);
    expect(isTranslatableText("https://example.com")).toBe(false);
    expect(isTranslatableText(" a ")).toBe(false);
    expect(isTranslatableText("हिन्दी")).toBe(true);
  });

  it("decodes the HTML entities Google returns", () => {
    expect(decodeEntities("We&#39;re ready &amp; waiting")).toBe("We're ready & waiting");
    expect(decodeEntities("caf&#xE9;")).toBe("café");
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });

  it("interpolates named placeholders and leaves unknown ones alone", () => {
    expect(interpolate("Hello {name}, {count} guests", { name: "Maya", count: 300 })).toBe("Hello Maya, 300 guests");
    expect(interpolate("{missing} stays", {})).toBe("{missing} stays");
  });
});

describe("language catalogue", () => {
  it("ships the six Indian languages plus English", () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(["en", "hi", "bn", "gu", "kn", "ta", "mr"]);
    expect(DEFAULT_LANGUAGE).toBe("en");
    expect(getLanguage("ta").nativeLabel).toBe("தமிழ்");
  });

  it("validates codes and falls back to English", () => {
    expect(isLanguageCode("mr")).toBe(true);
    expect(isLanguageCode("fr")).toBe(false);
    expect(isLanguageCode(null)).toBe(false);
    expect(getLanguage("nope").code).toBe("en");
  });
});
