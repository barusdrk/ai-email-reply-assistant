import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe("Support safety controls", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("approval queue is available for human review", async ({ page }) => {
    await page.goto("/approvals");

    await expect(page).toHaveURL(/\/approvals/);

    const body = await page.locator("body").innerText();

    expect(body).not.toContain("An error occurred");
  });

  test("drafts page does not expose an unexpected automatic-send error", async ({
    page,
  }) => {
    await page.goto("/drafts");

    const body = await page.locator("body").innerText();

    expect(body).not.toContain("An error occurred in the <Approvals>");
    expect(body).not.toContain("Unhandled");
  });
});