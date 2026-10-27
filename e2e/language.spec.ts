import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // These journeys exercise language changes, not the first-run tour.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("eventas.tour.seen.v1", "2");
      window.localStorage.setItem("eventas.tour.landing.v1", "2");
    } catch {
      // Storage can be unavailable on the initial about:blank document.
    }
  });
});

/**
 * Google Translate is stubbed so the journey is deterministic and runs without a
 * key. The prefix keeps assertions independent of machine-translation wording.
 */
async function stubTranslation(page: Page) {
  await page.route("**/api/translate", async (route) => {
    const body = route.request().postDataJSON() as { target: string; texts: string[] };
    await route.fulfill({
      json: { translations: body.texts.map((text) => `हिंदी:${text}`), mode: "live" },
    });
  });
}

test("a visitor can read the landing page and chat in Hindi", async ({ page }) => {
  // Keep this journey in its own rate-limit bucket, separate from the other journeys.
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.7" });
  await stubTranslation(page);
  let assistantPayload: { language?: string } | null = null;
  page.on("request", (request) => {
    if (request.url().includes("/api/site-assistant")) {
      assistantPayload = request.postDataJSON() as { language?: string };
    }
  });

  await page.goto("/");
  const switcher = page.getByTestId("language-switcher").first();
  await switcher.selectOption("hi");

  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("हिंदी:");
  await expect(switcher).toHaveValue("hi");

  // The choice survives a reload and the document title follows it.
  await page.reload();
  await expect(page.getByTestId("language-switcher").first()).toHaveValue("hi");
  await expect.poll(() => page.title()).toContain("हिंदी:");

  await page.getByTestId("site-assistant-trigger").click();
  const input = page.locator("#site-assistant-input");
  await expect(input).toBeVisible();
  await input.fill("How is my data saved?");
  await input.press("Enter");
  await expect.poll(() => assistantPayload?.language).toBe("hi");
});

test("plan content and the copilot follow the selected language", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.8" });
  await stubTranslation(page);
  let assistantPayload: { language?: string } | null = null;
  page.on("request", (request) => {
    if (request.url().includes("/api/assistant")) {
      assistantPayload = request.postDataJSON() as { language?: string };
    }
  });

  await page.goto("/new?sample=wedding");
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
  await expect(page.getByText("Your planning studio").first()).toBeVisible();

  await page.getByTestId("language-switcher").first().selectOption("hi");
  await expect(page.locator("aside nav")).toContainText("हिंदी:");
  await expect(page.locator("header")).toContainText("हिंदी:");

  // Generated plan content is translated too, not just the chrome.
  await page.locator("aside nav button").nth(2).click();
  await expect(page.getByRole("main").first()).toContainText("हिंदी:", { timeout: 15_000 });

  await page.getByTestId("open-assistant").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const chat = page.locator("#assistant-input");
  await chat.fill("What should I do this month?");
  await chat.press("Enter");
  await expect.poll(() => assistantPayload?.language).toBe("hi");
});
