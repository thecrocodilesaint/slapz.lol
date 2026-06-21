const { expect, test } = require("@playwright/test");

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

function visualUser(viewportName) {
  const suffix = viewportName.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return {
    email: `phase3-${suffix}@example.com`,
    password: "TestPass123!",
    handle: `phase3_${suffix}`.slice(0, 24),
    name: `Phase ${suffix}`,
    bio: "Stable visual profile for responsive screenshot testing.",
    location: "Visual Test Lab",
  };
}

async function stabilizePage(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content: `
      #stars,
      #toast,
      .cursor-dot,
      .cursor-trail-dot {
        display: none !important;
      }

      *,
      *::before,
      *::after {
        animation: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition: none !important;
      }
    `,
  });
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function snapshot(page, name, mask = []) {
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    fullPage: true,
    mask,
    maxDiffPixelRatio: 0.015,
  });
}

async function openSignup(page) {
  await page.goto("/");
  await stabilizePage(page);
  await expect(page.getByRole("heading", { name: /build your profile/i })).toBeVisible();
  await page.locator('[data-landing-auth="signup"]').first().click();
  await expect(page.locator("#authForm")).toBeVisible();
}

async function signUpOrLogin(page, user) {
  await page.locator("#authEmail").fill(user.email);
  await page.locator("#authPassword").fill(user.password);
  await page.locator("#signupButton").click();

  try {
    await expect(page.locator("#onboardingScreen")).toBeVisible({ timeout: 8_000 });
    await page.locator("#onboardingSkipButton").click();
    await expect(page.locator("#onboardingScreen")).toBeHidden({ timeout: 10_000 });
  } catch {
    // Existing visual users with published profiles go straight to the dashboard.
  }

  await expect(page.locator('[data-dashboard-panel="home"]')).toBeVisible({ timeout: 25_000 });
}

async function openBioEditor(page) {
  await page.locator('[data-dashboard-target="bio"]').first().click();
  await expect(page.locator('[data-dashboard-panel="bio"]')).toBeVisible();
  const entryGate = page.locator("#musicGate.entry-active");
  if (await entryGate.isVisible().catch(() => false)) await entryGate.click();
}

async function publishStableProfile(page, user) {
  await openBioEditor(page);
  await page.locator("#nameInput").fill(user.name);
  await page.locator("#handleInput").fill(user.handle);
  await page.locator("#bioInput").fill(user.bio);
  await page.locator("#locationInput").fill(user.location);
  await page.locator("#saveButton").click();
  await expect(page.locator("#publicLink")).toHaveText(`/u/${user.handle}`, { timeout: 20_000 });
}

async function openPublicProfile(page, user) {
  await page.goto(`/u/${user.handle}`);
  await stabilizePage(page);
  const entryGate = page.locator("#musicGate.entry-active");
  if (await entryGate.isVisible().catch(() => false)) await entryGate.click();
  await expect(page.locator("#name")).toHaveText(user.name, { timeout: 15_000 });
}

for (const viewport of viewports) {
  test(`responsive visual baselines at ${viewport.name}`, async ({ page }) => {
    const user = visualUser(viewport.name);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto("/");
    await stabilizePage(page);
    await expect(page.getByRole("heading", { name: /build your profile/i })).toBeVisible();
    await snapshot(page, `${viewport.name}-landing`);

    await openSignup(page);
    await snapshot(page, `${viewport.name}-auth`);

    await signUpOrLogin(page, user);
    await stabilizePage(page);
    await snapshot(page, `${viewport.name}-dashboard-home`);

    await publishStableProfile(page, user);
    await stabilizePage(page);
    await snapshot(page, `${viewport.name}-bio-editor`, [page.locator("#uid"), page.locator("#views")]);

    await openPublicProfile(page, user);
    await snapshot(page, `${viewport.name}-public-profile`, [page.locator("#uid"), page.locator("#views")]);
  });
}
