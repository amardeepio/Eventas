import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // The landing tour has its own journey; keep these phone checks focused.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("eventas.tour.landing.v1", "2");
    } catch {
      // Storage can be unavailable on the initial about:blank document.
    }
  });
});

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("the phone header fits and the menu opens as a sheet", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Nothing may overflow horizontally at the narrowest common phone width.
  expect(await page.evaluate(() => document.body.scrollWidth - window.innerWidth)).toBe(0);

  await page.getByRole("button", { name: "Open menu" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId("language-switcher")).toBeVisible();
  await expect(sheet.getByRole("link", { name: /Start planning/ })).toBeVisible();
  await expect(sheet.getByRole("link", { name: /How it works/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Tour" })).toBeVisible();

  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(sheet).toBeHidden();
});

test("pulling down at the top offers a refresh", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    const touch = (y: number) =>
      new Touch({ identifier: 1, target: document.body, clientX: 180, clientY: y, pageX: 180, pageY: y });
    const fire = (type: string, touches: Touch[]) =>
      window.dispatchEvent(
        new TouchEvent(type, {
          touches,
          targetTouches: touches,
          changedTouches: touches,
          bubbles: true,
          cancelable: true,
        }),
      );
    fire("touchstart", [touch(60)]);
    fire("touchmove", [touch(160)]);
    fire("touchmove", [touch(300)]);
  });

  await expect(page.getByRole("status")).toHaveText(/Release to refresh/);

  const reloaded = page.waitForEvent("framenavigated", { predicate: (frame) => frame === page.mainFrame() });
  await page.evaluate(() => {
    window.dispatchEvent(
      new TouchEvent("touchend", {
        touches: [],
        targetTouches: [],
        changedTouches: [],
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await reloaded;
  await page.waitForLoadState("domcontentloaded");

  expect(
    await page.evaluate(
      () => (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type,
    ),
  ).toBe("reload");
});
