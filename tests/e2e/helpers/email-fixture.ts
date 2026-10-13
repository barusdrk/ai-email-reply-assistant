
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const serverDir = path.resolve(process.cwd(), "server");

async function getUserId(): Promise<string> {
  if (process.env.E2E_USER_ID && /^[a-f\d]{24}$/i.test(process.env.E2E_USER_ID)) {
    return process.env.E2E_USER_ID;
  }
  const envFile = await readFile(path.join(serverDir, ".env"), "utf8");
  const match = envFile.match(/^E2E_USER_ID=([a-f\d]{24})\s*$/m);
  if (!match) throw new Error("Set E2E_USER_ID in server/.env to the test user's MongoDB ID.");
  return match[1];
}

async function runFixture(operation: "create" | "delete", emailId?: string): Promise<{ emailId?: string; deleted?: boolean }> {
  const userId = await getUserId();
  const cliPath = path.join(serverDir, "node_modules", "tsx", "dist", "cli.mjs");
  const args = [cliPath, "src/scripts/e2eEmailFixture.ts", operation, userId];
  if (emailId) args.push(emailId);
  const { stdout } = await execFileAsync(process.execPath, args, {
    cwd: serverDir,
    env: { ...process.env, E2E_ALLOW_DB_FIXTURES: "true" },
  });
  const output = stdout.trim().split(/\r?\n/).at(-1);
  if (!output) throw new Error("The fixture script returned no output.");
  return JSON.parse(output) as { emailId?: string; deleted?: boolean };
}

export async function createTestEmail(): Promise<string> {
  const result = await runFixture("create");
  if (!result.emailId) throw new Error("The fixture did not return an email ID.");
  return result.emailId;
}

export async function deleteTestEmail(emailId: string): Promise<void> {
  const result = await runFixture("delete", emailId);
  if (result.deleted !== true) throw new Error(`Could not delete test email ${emailId}.`);
}
