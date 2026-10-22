// Shared pieces of the interactive OAuth checks (oauth-smoke.ts and
// oauth-rejections.ts): setup, the loopback browser redirect, and reporting.
// Token values are never printed.
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { env, exit } from "node:process";
import { AuthenticationError, HardcoverClient, type Environment } from "../src/index.ts";
import type { AuthorizationAttempt, OAuthSession } from "../src/oauth/index.ts";

export const USER_AGENT = "hardcover-sdk-oauth-smoke";
export const environment = (env.HARDCOVER_ENV ?? "local") as Environment;

export function requireClientId(): string {
  const clientId = env.HARDCOVER_OAUTH_CLIENT_ID;

  if (!clientId) {
    console.error("Set HARDCOVER_OAUTH_CLIENT_ID to your app's client id.");
    exit(1);
  }

  return clientId;
}

// Pass/fail lines, then a summary and the exit code.
const results: [string, boolean][] = [];

export function check(name: string, passed: boolean): void {
  results.push([name, passed]);
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
}

export function report(): never {
  const failed = results.filter(([, passed]) => !passed).length;

  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  exit(failed ? 1 : 0);
}

/** Whether the server still accepts this access token, asked with a client pinned to it. */
export async function accepted(token: string): Promise<boolean> {
  try {
    await new HardcoverClient({ token, environment, userAgent: USER_AGENT }).me.get();
    return true;
  } catch (error) {
    if (error instanceof AuthenticationError) return false;
    throw error;
  }
}

/**
 * Opens the authorize page and waits for the redirect back, on a free
 * loopback port. Returns the redirect URL and the attempt that started it;
 * the caller decides what to do with them.
 */
export async function browserRedirect(
  session: OAuthSession,
  scopes: readonly string[],
): Promise<{ url: string; attempt: AuthorizationAttempt }> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  const attempt = session.authorize({ scopes, redirectUri: `http://127.0.0.1:${port}/callback` });

  const redirect = new Promise<string>((resolve) => {
    server.on("request", (request, response) => {
      if (!request.url?.startsWith("/callback")) return void response.writeHead(404).end();

      response.writeHead(200, { "content-type": "text/plain" }).end("Done. You can close this tab.");
      resolve(`http://127.0.0.1:${port}${request.url}`);
    });
  });

  console.log(`Opening the authorize page. If it doesn't open, visit:\n${attempt.url}\n`);
  execFile("open", [attempt.url]);

  const url = await redirect;
  server.close();

  return { url, attempt };
}

/** Runs `fn` and returns what it threw, or undefined if it didn't throw. */
export async function thrown(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
    return undefined;
  } catch (error) {
    return error;
  }
}
