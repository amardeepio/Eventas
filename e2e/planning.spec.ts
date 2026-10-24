import { expect, test } from "@playwright/test";

test("a sample wedding becomes an editable, persistent plan", async ({ page }) => {
  await page.goto("/new?sample=wedding");
  await expect(page).toHaveURL(/\/plan/, { timeout: 15_000 });
  await expect(page.getByText("Your planning studio").first()).toBeVisible();
  await expect(page.getByText("Maya & Dev’s wedding").first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Budget", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Every dollar has a job." })).toBeVisible();
  const food = page.getByLabel("Food & drinks planned amount");
  await food.fill("5000");
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole("button", { name: "Budget", exact: true }).first().click();
  await expect(page.getByLabel("Food & drinks planned amount")).toHaveValue("5000");
});

test("the assistant answers with the plan context", async ({ page }) => {
  await page.goto("/new?sample=birthday");
  await expect(page).toHaveURL(/\/plan/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Ask Eventas" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Where am I overspending?" }).click();
  await expect(page.getByRole("log")).toContainText(/budget|spend|allocat/i, { timeout: 30_000 });
});

test("a first-time host can complete the brief", async ({ page }) => {
  await page.goto("/new");
  await expect(page.getByRole("heading", { name: "What are we bringing to life?" })).toBeVisible();
  await page.getByText("Birthday", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Birthday/ })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Give us the basics." })).toBeVisible();

  await page.getByLabel("Host").fill("Rina");
  await page.getByLabel("Expected guests").fill("40");
  await page.getByLabel("Event date").fill("2027-03-14");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("City or area").fill("Chicago, IL");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByText("Dinner with friends", { exact: true }).click();
  await page.getByRole("button", { name: "Create my plan" }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
  await expect(page.getByText("Our birthday").first()).toBeVisible();
  await expect(page.getByText("40 guests").first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
});

test("a host can edit the brief and rebuild the plan", async ({ page }) => {
  await page.goto("/new?sample=wedding");
  await expect(page).toHaveURL(/\/plan/, { timeout: 15_000 });
  await page.getByRole("link", { name: "Edit brief" }).first().click();
  await expect(page.getByText("Editing your brief.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Event title")).toHaveValue("Maya & Dev’s wedding");
  await page.getByLabel("Expected guests").fill("90");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Rebuild my plan" }).click();
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
  await expect(page.getByText("90 guests").first()).toBeVisible();
});

test("the landing page is responsive and visually complete", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Make room for the moment/i })).toBeVisible();
  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "Plan my event" })).toBeVisible();
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
});
