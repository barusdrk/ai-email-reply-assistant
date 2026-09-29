import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe("Protected navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const routes = [
    ["/", /dashboard|\/$/],
    ["/dashboard", /dashboard/],
    ["/inbox", /inbox/],
    ["/drafts", /drafts/],
    ["/approvals", /approvals/],
    ["/sent", /sent/],
    ["/settings", /settings/],
    ["/billing", /billing/],
    ["/knowledge-base", /knowledge-base/],
  ] as const;

  for (const [route, expected] of routes) {
    test(`loads ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(expected);
    });
  }

  test("unknown route redirects to dashboard", async ({ page }) => {
    await page.goto("/does-not-exist");

    await expect(page).toHaveURL(/\/$/);
  });
});
