import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
