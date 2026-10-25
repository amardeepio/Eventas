import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, useLanguage } from "./language-provider";
import { DocumentTranslator } from "./document-translator";
import { clearTranslationCache } from "../translate/client";

function mockFetch(prefix = "अनुवाद") {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { texts: string[] };
    return Response.json({ translations: body.texts.map((text) => `${prefix}:${text}`), mode: "live" });
  }));
}

function Probe() {
  const { language, setLanguage, t, ready } = useLanguage();
  return <div>
    <p>{t("Save the date")}</p>
    <p>{t("Hello {name}", { name: "Maya" })}</p>
    <span data-testid="language">{ready ? language : "loading"}</span>
    <button type="button" onClick={() => setLanguage("hi")}>hindi</button>
    <button type="button" onClick={() => setLanguage("en")}>english</button>
  </div>;
}

function TranslatedPage() {
  const { setLanguage } = useLanguage();
  return <div>
    <DocumentTranslator />
    <p>Budget health</p>
    <p translate="no">eventas.</p>
    <button type="button" data-testid="switch-hi" onClick={() => setLanguage("hi")}>hindi</button>
    <button type="button" data-testid="switch-en" onClick={() => setLanguage("en")}>english</button>
  </div>;
}

function AttributePage() {
  const { setLanguage } = useLanguage();
  return <div>
    <DocumentTranslator />
    <input aria-label="Search vendors" placeholder="Ask about budget" title="Vendor search" />
    <button type="button" data-testid="switch-hi" onClick={() => setLanguage("hi")}>hindi</button>
  </div>;
}

function DynamicPage() {
  const [show, setShow] = useState(false);
  const { setLanguage } = useLanguage();
  return <div>
    <DocumentTranslator />
    <button type="button" data-testid="switch-hi" onClick={() => setLanguage("hi")}>hindi</button>
    <button type="button" data-testid="reveal" onClick={() => setShow(true)}>reveal</button>
    {show && <p>Vendor checklist</p>}
  </div>;
}

describe("language provider", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTranslationCache();
    mockFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("starts in English and translates literals on demand", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByText("Save the date")).toBeInTheDocument();
    expect(screen.getByTestId("language")).toHaveTextContent("en");

    await user.click(screen.getByRole("button", { name: "hindi" }));
    await waitFor(() => expect(screen.getByText("अनुवाद:Save the date")).toBeInTheDocument());
    expect(screen.getByText("अनुवाद:Hello Maya")).toBeInTheDocument();
    expect(screen.getByTestId("language")).toHaveTextContent("hi");
    expect(document.documentElement.lang).toBe("hi");
    expect(localStorage.getItem("eventas.language.v1")).toBe("hi");
  });

  it("remembers the chosen language on the next visit", async () => {
    localStorage.setItem("eventas.language.v1", "ta");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    await waitFor(() => expect(screen.getByTestId("language")).toHaveTextContent("ta"));
    await waitFor(() => expect(screen.getByText("अनुवाद:Save the date")).toBeInTheDocument());
  });
});

describe("document translator", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTranslationCache();
    mockFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("translates rendered text, skips opted-out nodes, and restores English", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><TranslatedPage /></LanguageProvider>);
    await waitFor(() => expect(screen.getByText("Budget health")).toBeInTheDocument());

    await user.click(screen.getByTestId("switch-hi"));
    await waitFor(() => expect(screen.getByText("अनुवाद:Budget health")).toBeInTheDocument());
    // Brand and user-authored areas must stay untouched.
    expect(screen.getByText("eventas.")).toBeInTheDocument();

    await user.click(screen.getByTestId("switch-en"));
    await waitFor(() => expect(screen.getByText("Budget health")).toBeInTheDocument());
  });

  it("translates accessible attributes", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><AttributePage /></LanguageProvider>);
    await user.click(screen.getByTestId("switch-hi"));
    await waitFor(() => expect(screen.getByLabelText("अनुवाद:Search vendors")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("अनुवाद:Ask about budget")).toBeInTheDocument();
    expect(screen.getByTitle("अनुवाद:Vendor search")).toBeInTheDocument();
  });

  it("translates content that mounts after the switch", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><DynamicPage /></LanguageProvider>);
    await user.click(screen.getByTestId("switch-hi"));
    await waitFor(() => expect(screen.getByText("अनुवाद:hindi")).toBeInTheDocument());
    await user.click(screen.getByTestId("reveal"));
    await waitFor(() => expect(screen.getByText("अनुवाद:Vendor checklist")).toBeInTheDocument());
  });
});
