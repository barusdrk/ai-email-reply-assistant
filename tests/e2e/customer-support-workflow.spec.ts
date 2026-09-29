import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe("Customer support workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("inbox is accessible", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.locator("body")).not.toContainText(
      "Something went wrong",
    );
  });

  test("drafts page is accessible", async ({ page }) => {
    await page.goto("/drafts");
    await expect(page).toHaveURL(/\/drafts/);
    await expect(page.locator("body")).not.toContainText(
      "An error occurred",
    );
  });

  test("approval queue is accessible", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page).toHaveURL(/\/approvals/);
    await expect(page.locator("body")).not.toContainText(
      "An error occurred",
    );
  });

  test("sent page is accessible", async ({ page }) => {
    await page.goto("/sent");
    await expect(page).toHaveURL(/\/sent/);
    await expect(page.locator("body")).not.toContainText(
      "An error occurred",
    );
  });
});
