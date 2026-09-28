/**
 * Handling errors, and testing your own code without the network.
 *
 * Every failure is a HardcoverError subclass. The ones apps usually handle:
 * - ScopeError: the token lacks a scope; `requiredScope` names it.
 * - AuthenticationError: expired or revoked token.
 * - RateLimitError: only when the *daily* cap is spent; bursts are paced for you.
 * - ActionError: the API rejected a write; `messages` explain why.
 * - NetworkError / TimeoutError: `mayHaveSucceeded` is true for writes that
 *   may have landed. Check before retrying.
 */
import {
  ActionError,
  AuthenticationError,
  HardcoverClient,
  NetworkError,
  RateLimitError,
  ScopeError,
} from "@hardcover/sdk";
import { MockTransport } from "@hardcover/sdk/testing";

export async function handleErrors(hc: HardcoverClient, bookId: number) {
  try {
    await hc.library.add(bookId);
  } catch (error) {
    if (error instanceof ScopeError) console.log(`Ask the user to grant ${error.requiredScope}`);
    else if (error instanceof AuthenticationError) console.log("Sign in again");
    else if (error instanceof RateLimitError) console.log(`Daily limit reached; try in ${error.retryAfterSeconds}s`);
    else if (error instanceof ActionError) console.log(error.messages.join("\n"));
    else if (error instanceof NetworkError && error.mayHaveSucceeded) console.log("Check the shelf before retrying");
    else throw error;
  }
}

/** Your tests can drive a real client with canned responses. */
export async function testWithoutTheNetwork() {
  const transport = new MockTransport([
    { status: 200, body: { data: { me: [{ id: 1, username: "reader", timezone: "UTC" }] } } },
  ]);
  const hc = new HardcoverClient({ token: "test-token", transport });

  const me = await hc.me.get();
  console.log(me.username); // "reader"
  console.log(transport.requests.length); // 1: every request the client sent
}
