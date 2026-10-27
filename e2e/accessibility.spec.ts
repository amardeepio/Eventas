import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Keep each journey's AI budget in its own rate-limit bucket.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.12" } });

test.beforeEach(async ({ page }) => {
  // Keep axe focused on the page itself, not the first-run tour overlay.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("eventas.tour.seen.v1", "2");
      window.localStorage.setItem("eventas.tour.landing.v1", "2");
    } catch {
      // Storage can be unavailable on the initial about:blank document.
    }
  });
});

async function seriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
}

test("core journeys have no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(900);
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole("button", { name: "Ask about Eventas" }).click();
  await page.waitForTimeout(400);
  expect(await seriousViolations(page)).toEqual([]);
  await page.keyboard.press("Escape");

  await page.goto("/new");
  await page.waitForTimeout(500);
  expect(await seriousViolations(page)).toEqual([]);

  await page.goto("/new?sample=community");
  await expect(page).toHaveURL(/\/plan/, { timeout: 15_000 });
  await page.waitForTimeout(900);
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole("button", { name: "Ask Eventas" }).first().click();
  await page.waitForTimeout(500);
  expect(await seriousViolations(page)).toEqual([]);
});

test("the functions view has no serious accessibility violations", async ({ page }) => {
  await page.goto("/new?sample=wedding");
  await expect(page).toHaveURL(/\/plan/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Functions", exact: true }).first().click();
  await page.waitForTimeout(700);
  expect(await seriousViolations(page)).toEqual([]);
});
