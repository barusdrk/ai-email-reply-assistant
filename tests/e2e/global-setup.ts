import type { FullConfig } from "@playwright/test";

export default async function globalSetup(_config: FullConfig) {
const baseURL = (process.env.E2E_API_URL?.trim() || "http://localhost:3001/api").replace(/\/+$/, "");
const email = process.env.E2E_USER_EMAIL ?? "[demo@example.com](mailto:demo@example.com)";
const password = process.env.E2E_USER_PASSWORD ?? "password123";
const headers = { "Content-Type": "application/json" };
const registerResponse = await fetch(`${baseURL}/auth/register`, {
method: "POST",
headers,
body: JSON.stringify({ name: "E2E Test User", email, password }),
});

if (registerResponse.status === 201) {
console.log("E2E test account created.");
return;
}

if (registerResponse.status === 400) {
const loginResponse = await fetch(`${baseURL}/auth/login`, {
method: "POST",
headers,
body: JSON.stringify({ email, password }),
});


if (loginResponse.ok) {
  console.log("E2E test account already exists.");
  return;
}

throw new Error(
  "The E2E account already exists, but its credentials are invalid. Use a fresh test account or reset the local test database.",
);

}

const details = await registerResponse.text();
throw new Error(
`E2E account setup failed with HTTP ${registerResponse.status}: ${details}`,
);
}
