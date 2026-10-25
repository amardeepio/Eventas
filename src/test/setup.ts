import "@testing-library/jest-dom/vitest";
import "jest-axe/extend-expect";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
delete process.env.GROQ_API_KEY;
process.env.GROQ_API_KEY = "";
delete process.env.GOOGLE_TRANSLATE_API_KEY;
process.env.GOOGLE_TRANSLATE_API_KEY = "";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});
