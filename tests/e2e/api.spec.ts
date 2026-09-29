import { expect, test } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";

test.describe("API contracts", () => {
  test("unauthenticated request is rejected", async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`);

    expect([401, 403]).toContain(response.status());
  });

  test("login returns an authenticated session", async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: "demo@example.com",
        password: "password123",
      },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    expect(body.user).toBeDefined();
    expect(body.token).toBeTruthy();
  });

  test("authenticated settings endpoint is accessible", async ({
    request,
  }) => {
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: "demo@example.com",
        password: "password123",
      },
    });

    expect(loginResponse.ok()).toBeTruthy();

    const { token } = await loginResponse.json();

    const response = await request.get(`${API_URL}/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const settings = await response.json();

    expect(settings).toBeDefined();
  });

  test("authenticated subscription endpoint is accessible", async ({
    request,
  }) => {
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: "demo@example.com",
        password: "password123",
      },
    });

    expect(loginResponse.ok()).toBeTruthy();

    const { token } = await loginResponse.json();

    const response = await request.get(`${API_URL}/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(
      response.ok(),
      `Billing API returned ${response.status()}: ${await response.text()}`,
    ).toBeTruthy();

    const billing = await response.json();
    expect(billing).toBeDefined();
  });
});
