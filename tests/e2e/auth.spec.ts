import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "AI Email Reply Assistant" }),
    ).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email Address").fill("invalid@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test("logs in with the demo account", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email Address").fill("demo@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  });

  test("opens registration form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", {
      name: "Create a new account",
    }).click();

    await expect(
      page.getByRole("heading", { name: "Create Account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByLabel("Password", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
  });

  test("rejects mismatched registration passwords", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", {
      name: "Create a new account",
    }).click();

    await page.getByLabel("Name").fill("E2E Test User");
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("different123");

    await page.getByRole("button", {
      name: "Create Account",
    }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });
});
