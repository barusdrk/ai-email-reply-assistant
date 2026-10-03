import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe("Empty card states", () => {
  test("does not render DraftCard when there are no drafts", async ({ page }) => {
    await login(page);
    await page.route("**/api/drafts", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );

    await page.goto("/drafts");

    await expect(page.getByText("No drafts available.")).toBeVisible();
    await expect(page.getByTestId("draft-card")).toHaveCount(0);
  });

  test("does not render ApprovalCard when there are no approvals", async ({ page }) => {
    await login(page);
    await page.route("**/api/approvals", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );

    await page.goto("/approvals");

    await expect(page.getByText("No replies waiting for approval.")).toBeVisible();
    await expect(page.getByTestId("approval-card")).toHaveCount(0);
  });
});
