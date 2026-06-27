const { expect, test } = require("@playwright/test");

const viewports = [
  { name: "mobile-360", width: 360, height: 780 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "ipad-1024", width: 1024, height: 768 },
];

const sections = ["home", "bio", "games", "leaderboards", "communities", "settings"];

function uniqueUser(testInfo, viewportName) {
  const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.random().toString(36).slice(2, 7)}`;
  return {
    email: `layout-${viewportName}-${id}@example.com`,
    password: "TestPass123!",
  };
}

async function expectNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${label} should not overflow horizontally`).toBeLessThanOrEqual(1);
}

async function expectVisibleContentInsideViewport(page, label) {
  const offenders = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const selectors = [
      ".account-sidebar",
      ".dashboard-quick-controls",
      ".dashboard-panel:not([hidden])",
      ".dashboard-home:not([hidden])",
      ".dashboard-bio:not([hidden])",
      ".dashboard-games:not([hidden])",
      ".dashboard-leaderboards:not([hidden])",
      ".dashboard-communities:not([hidden])",
      ".dashboard-settings:not([hidden])",
      ".dashboard-owner:not([hidden])",
    ];

    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .map((element) => ({
        selector: element.className || element.id || element.tagName,
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
        viewportWidth,
      }));
  });

  expect(offenders, `${label} should keep main UI inside the viewport`).toEqual([]);
}

async function signUpAndOpenDashboard(page, user) {
  await page.goto("/");
  await page.locator('[data-landing-auth="signup"]').first().click();
  await page.locator("#authEmail").fill(user.email);
  await page.locator("#authPassword").fill(user.password);
  await page.locator("#signupButton").click();
  await page.locator("#onboardingScreen").waitFor({ state: "visible", timeout: 25_000 });
  await page.locator("#onboardingSkipButton").click();
  await page.locator('[data-dashboard-panel="home"]').waitFor({ state: "visible", timeout: 15_000 });
}

for (const viewport of viewports) {
  test(`dashboard sections fit without horizontal overflow at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const user = uniqueUser(testInfo, viewport.name);
    await signUpAndOpenDashboard(page, user);

    for (const section of sections) {
      await page.locator(`[data-dashboard-target="${section}"]`).first().click();
      await page.waitForTimeout(250);
      const entryGate = page.locator("#musicGate.entry-active");
      if (await entryGate.isVisible().catch(() => false)) await entryGate.click();

      const label = `${viewport.name} ${section}`;
      await expectNoHorizontalOverflow(page, label);
      await expectVisibleContentInsideViewport(page, label);
    }
  });
}

