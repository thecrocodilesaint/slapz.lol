const { expect, test } = require("@playwright/test");

function uniqueUser(testInfo, label = "smoke") {
  const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.random().toString(36).slice(2, 7)}`;
  return {
    email: `${label}-${id}@example.com`,
    password: "TestPass123!",
    handle: `${label}-${id}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24),
    name: `Smoke ${label}`,
  };
}

async function startSignup(page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /build your profile/i })).toBeVisible();
  await page.locator('[data-landing-auth="signup"]').first().click();
  await expect(page.locator("#authForm")).toBeVisible();
  await expect(page.locator("#authTitle")).toHaveText("Make your profile");
}

async function signUp(page, user) {
  await startSignup(page);
  await page.locator("#authEmail").fill(user.email);
  await page.locator("#authPassword").fill(user.password);
  await page.locator("#signupButton").click();
  await expect(page.locator("#onboardingScreen")).toBeVisible({ timeout: 25_000 });
}

async function skipOnboarding(page) {
  await page.locator("#onboardingSkipButton").click();
  await expect(page.locator("#onboardingScreen")).toBeHidden({ timeout: 10_000 });
  await expect(page.locator('[data-dashboard-panel="home"]')).toBeVisible({ timeout: 10_000 });
}

async function publishBio(page, user) {
  await page.locator('[data-dashboard-target="bio"]').first().click();
  await expect(page.locator('[data-dashboard-panel="bio"]')).toBeVisible();
  const bioEntryGate = page.locator("#musicGate.entry-active");
  if (await bioEntryGate.isVisible().catch(() => false)) await bioEntryGate.click();
  await page.locator("#nameInput").fill(user.name);
  await page.locator("#handleInput").fill(user.handle);
  await page.locator("#bioInput").fill("Automated smoke test bio for fun.lol.");
  await page.locator("#locationInput").fill("Test Lab");
  await page.locator("#saveButton").click();
  await expect(page.locator("#publicLink")).toHaveText(`/u/${user.handle}`, { timeout: 20_000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("landing page loads and opens the login form", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/fun\.lol/i);
  await expect(page.getByRole("heading", { name: /build your profile/i })).toBeVisible();
  await expect(page.getByText(/customizable public profile platform/i)).toBeVisible();

  await page.locator('[data-landing-auth="login"]').first().click();
  await expect(page.locator("#authForm")).toBeVisible();
  await expect(page.locator("#authTitle")).toHaveText("Welcome back");
  await expect(page.locator("#loginButton")).toBeVisible();
});

test("new user can sign up and skip onboarding", async ({ page }, testInfo) => {
  const user = uniqueUser(testInfo, "skip");
  await signUp(page, user);
  await expect(page.locator("#onboardingTitle")).toContainText("Welcome to fun.lol");
  await skipOnboarding(page);
  await expect(page.getByRole("heading", { name: /welcome to fun\.lol/i })).toBeVisible();
});

test("new user can publish a Bio and open the public profile", async ({ page }, testInfo) => {
  const user = uniqueUser(testInfo, "bio");
  await signUp(page, user);
  await skipOnboarding(page);
  await publishBio(page, user);

  await page.goto(`/u/${user.handle}`);
  const entryGate = page.locator("#musicGate.entry-active");
  if (await entryGate.isVisible().catch(() => false)) await entryGate.click();

  await expect(page.locator("#name")).toHaveText(user.name, { timeout: 15_000 });
  await expect(page.locator("#handle")).toHaveText(`@${user.handle}`);
  await expect(page.locator("#bio")).toContainText("Automated smoke test bio");
});

test("mobile landing and auth screens do not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /build your profile/i })).toBeVisible();

  const landingFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(landingFits).toBeTruthy();

  await page.locator('[data-landing-auth="signup"]').first().click();
  await expect(page.locator("#authForm")).toBeVisible();

  const authFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(authFits).toBeTruthy();
});
