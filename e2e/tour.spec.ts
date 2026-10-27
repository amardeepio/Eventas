import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const tour = (page: Page) => page.getByTestId("guided-tour");
const landingTour = (page: Page) => page.getByTestId("landing-tour");

async function atStep(page: Page, id: string) {
  await expect(tour(page)).toHaveAttribute("data-step", id);
}

async function nextStep(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

// Keep each journey's AI budget in its own rate-limit bucket.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.21" } });

test("first-time visitors get a short landing tour", async ({ page }) => {
  await page.goto("/");
  await expect(landingTour(page)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("dialog", { name: /short tour of eventas/i })).toBeVisible();

  await page.getByRole("button", { name: "Show me around" }).click();
  await expect(landingTour(page)).toHaveAttribute("data-step", "hero");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/landing-tour.png" });

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(landingTour(page)).toHaveAttribute("data-step", "preview");
  for (let step = 0; step < 5; step += 1) await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(landingTour(page)).toHaveAttribute("data-step", "finish");

  await landingTour(page).getByRole("link", { name: /plan my event/i }).click();
  await expect(page).toHaveURL(/\/new/);

  // Seen once: a return visit does not reopen it, but the header can replay it.
  await page.goto("/");
  await page.waitForTimeout(2200);
  await expect(landingTour(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Tour", exact: true }).click();
  await expect(landingTour(page)).toBeVisible();
});

test("first-time users are guided through every view on desktop", async ({ page }) => {
  await page.goto("/new?sample=wedding");
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });

  await expect(tour(page)).toBeVisible({ timeout: 10_000 });
  await atStep(page, "welcome");
  await expect(page.getByRole("dialog", { name: /quick tour of your studio/i })).toBeVisible();

  await page.getByRole("button", { name: "Show me around" }).click();
  await atStep(page, "brief");
  await expect(tour(page)).toContainText("Your whole event, one line");
  await page.waitForTimeout(700);

  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze())
    .violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(violations).toEqual([]);

  await nextStep(page);
  await atStep(page, "navigation");
  await expect(tour(page)).toContainText("6 calm views");
  await expect(tour(page)).toContainText("Functions");

  await nextStep(page);
  await atStep(page, "overview");
  await expect(tour(page)).toContainText("The day at a glance");

  await nextStep(page);
  await atStep(page, "next-moves");
  await page.getByRole("button", { name: /tick my first milestone/i }).click();
  await expect(tour(page).getByRole("status")).toContainText("is done");

  await nextStep(page);
  await atStep(page, "functions");
  await expect(page.locator("main:not([inert])")).toContainText("Functions");

  await nextStep(page);
  await atStep(page, "budget");
  await expect(page.locator("main:not([inert])")).toContainText("Every rupee has a job.");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/tour-budget.png" });

  await nextStep(page);
  await atStep(page, "timeline");
  await expect(page.locator("main:not([inert])")).toContainText(/milestones ahead/);

  await nextStep(page);
  await atStep(page, "vendors");
  await expect(page.locator("main:not([inert])")).toContainText("key vendor categories booked");
  await page.getByRole("button", { name: /mark a vendor as contacted/i }).click();
  await expect(tour(page).getByRole("status")).toContainText("marked as contacted");

  await nextStep(page);
  await atStep(page, "ideas");
  await expect(page.locator("main:not([inert])")).toContainText("Fresh ideas");

  await nextStep(page);
  await atStep(page, "assistant");
  await expect(tour(page)).toContainText("A copilot that knows the plan");

  await nextStep(page);
  await atStep(page, "actions");
  await expect(tour(page)).toContainText("switch language");

  await nextStep(page);
  await atStep(page, "export");
  await expect(tour(page)).toContainText("print-ready PDF");
  const events = await page.evaluate(() => JSON.parse(sessionStorage.getItem("eventas.tour.events.v1") ?? "[]") as { action: string; stepId?: string }[]);
  expect(events.some((event) => event.action === "step" && event.stepId === "budget")).toBe(true);

  await nextStep(page);
  await atStep(page, "finish");
  await expect(page.locator("main:not([inert])")).toContainText("Your next three moves");

  // The final secondary action hands the host straight to the copilot.
  await page.getByRole("button", { name: "Ask my first question" }).click();
  await expect(page.getByRole("dialog", { name: /ask eventas/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /ask eventas/i })).toBeHidden();

  // Interactive tour edits are undoable from the header and the sidebar.
  await expect(page.getByRole("button", { name: "Undo last change" }).first()).toBeEnabled();

  // Replay is always one tap away in the sidebar.
  await page.getByRole("button", { name: "Take the tour" }).click();
  await expect(tour(page)).toBeVisible();
  await atStep(page, "welcome");
});

test("the header help centre can reset and replay the tour", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("eventas.tour.seen.v1", "2");
      window.localStorage.setItem("eventas.tour.landing.v1", "2");
    } catch {}
  });
  await page.goto("/new?sample=wedding");
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
  await expect(tour(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Help and tours" }).click();
  const help = page.getByRole("dialog", { name: /help & tours/i });
  await expect(help).toBeVisible();
  await expect(help).toContainText("Take the studio tour");

  await page.getByRole("button", { name: "Reset tour hints" }).click();
  await expect(help.getByRole("status")).toHaveText(/reset/i);
  expect(await page.evaluate(() => localStorage.getItem("eventas.tour.seen.v1"))).toBeNull();

  await page.getByRole("button", { name: "Take the studio tour" }).click();
  await expect(tour(page)).toBeVisible({ timeout: 5_000 });
  await atStep(page, "welcome");
});

test("a reload mid-tour resumes at the same step", async ({ page }) => {
  await page.goto("/new?sample=wedding");
  await expect(tour(page)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Show me around" }).click();
  for (let step = 0; step < 8; step += 1) {
    if (await page.locator('[data-testid="guided-tour"][data-step="budget"]').count()) break;
    await nextStep(page);
  }
  await atStep(page, "budget");
  await expect(page.locator("main:not([inert])")).toContainText("Every rupee has a job.");

  await page.reload();
  await expect(tour(page)).toHaveAttribute("data-step", "budget", { timeout: 10_000 });
  await expect(page.locator("main:not([inert])")).toContainText("Every rupee has a job.");
});

test("skipping snoozes the tour without permanently dismissing it", async ({ page }) => {
  await page.goto("/new?sample=birthday");
  await expect(tour(page)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Skip tour" }).click();
  await expect(tour(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("eventas.tour.seen.v1"))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem("eventas.tour.snooze.studio"))).toBe("1");

  await page.reload();
  await page.waitForTimeout(1500);
  await expect(tour(page)).toHaveCount(0);
});

test.describe("tablet", () => {
  test.use({ viewport: { width: 820, height: 1100 }, hasTouch: true });

  test("the tour card stays inside a tablet viewport", async ({ page }) => {
    await page.goto("/new?sample=wedding");
    await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
    const card = tour(page);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Show me around" }).click();
    await page.waitForTimeout(700);

    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(820.5);
    expect(box!.y).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(1100.5);
  });
});

test.describe("landscape phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test("the tour card scrolls but never overflows a short viewport", async ({ page }) => {
    await page.goto("/new?sample=birthday");
    await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
    const card = tour(page);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Show me around" }).click();
    await page.waitForTimeout(700);

    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(844.5);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(390.5);
    expect(await page.evaluate(() => document.body.scrollWidth - window.innerWidth)).toBe(0);
  });
});

test.describe("compact phone", () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });

  test("the tour remains usable at 320px", async ({ page }) => {
    await page.goto("/new?sample=community");
    await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
    const card = tour(page);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Show me around" }).click();
    await page.waitForTimeout(700);

    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320.5);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568.5);
    expect(await page.evaluate(() => document.body.scrollWidth - window.innerWidth)).toBe(0);
  });
});

test.describe("phone view", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, extraHTTPHeaders: { "x-forwarded-for": "198.51.100.22" } });

  test("the landing tour keeps its highlight visible above the Ask button", async ({ page }) => {
    await page.goto("/");
    await expect(landingTour(page)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Show me around" }).click();
    for (let step = 0; step < 5; step += 1) await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(landingTour(page)).toHaveAttribute("data-step", "assistant");
    await page.waitForTimeout(400);

    const card = await landingTour(page).boundingBox();
    const ask = await page.getByTestId("site-assistant-trigger").boundingBox();
    expect(card).not.toBeNull();
    expect(ask).not.toBeNull();
    expect(card!.y).toBeGreaterThan(0);
    expect(card!.y + card!.height).toBeLessThan(ask!.y);
    expect(ask!.y + ask!.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: "test-results/landing-tour-mobile.png" });

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(landingTour(page)).toHaveAttribute("data-step", "finish");
    await landingTour(page).getByRole("link", { name: /plan my event/i }).click();
    await expect(page).toHaveURL(/\/new/);
  });

  test("the studio tour docks as a bottom sheet and adapts to the event type", async ({ page }) => {
    await page.goto("/new?sample=birthday");
    await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });

    await expect(tour(page)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Show me around" }).click();
    await atStep(page, "brief");

    const box = await tour(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390.5);
    expect(box!.y).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844.5);

    // The spotlight must not introduce horizontal page overflow.
    expect(await page.evaluate(() => document.body.scrollWidth - window.innerWidth)).toBe(0);
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/tour-mobile.png" });

    await nextStep(page);
    await atStep(page, "navigation");
    await expect(tour(page)).toContainText("5 calm views");
    await expect(tour(page)).not.toContainText("Functions");
    await expect(tour(page)).toHaveCount(1);

    // Walk the shared views; a birthday plan never gets a functions stop.
    for (let step = 0; step < 8; step += 1) await nextStep(page);
    await atStep(page, "actions");
    await expect(tour(page)).toContainText("switch language");
    await expect(tour(page)).toContainText("start a new plan");

    await nextStep(page);
    await nextStep(page);
    await atStep(page, "finish");
    await page.getByRole("button", { name: "Start planning" }).click();
    await expect(tour(page)).toHaveCount(0);

    // Replay lives in the mobile navigation sheet alongside the other actions.
    await page.getByRole("button", { name: "Open navigation" }).click();
    const sheet = page.getByRole("dialog", { name: "Plan navigation" });
    await expect(sheet).toContainText("Edit brief");
    await expect(sheet).toContainText("New event plan");
    await expect(sheet).toContainText("Delete plan");
    await page.getByRole("button", { name: "Take the tour" }).click();
    await expect(tour(page)).toBeVisible();
    await atStep(page, "welcome");
  });
});
