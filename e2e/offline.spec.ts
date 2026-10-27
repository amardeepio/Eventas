import { expect, test } from "@playwright/test";

test("the studio reloads from the service worker while offline", async ({ page, context }) => {
  await page.goto("/new?sample=birthday");
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
  await expect(page.getByText("Rina’s 40th birthday").first()).toBeVisible();

  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    }
  });
  // A second online visit is what puts this exact plan URL in the shell cache.
  await page.reload();
  await expect(page.getByText("Rina’s 40th birthday").first()).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Rina’s 40th birthday").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("status")).toContainText(/Offline/);
  await context.setOffline(false);
});
