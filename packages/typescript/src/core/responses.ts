// Turning an HTTP response into data or one of the shared errors
// (shared/errors.json). Plain functions: no client state.
import {
  ActionError,
  AuthenticationError,
  GraphQLError,
  HardcoverError,
  InvalidRequestError,
  RateLimitError,
  RequestTooLargeError,
  ScopeError,
  ServerError,
  TimeoutError,
  UnsupportedOperationError,
} from "./errors.ts";
import type { RateLimitState } from "./rate-limit.ts";
import type { HttpResponse } from "./transport.ts";

/** A parsed response body. GraphQL, gateway and action errors all use some of these keys. */
export type Payload = {
  data?: Record<string, unknown> | null;
  errors?: unknown;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
  scope?: unknown;
};

/** The JSON body, or undefined when it isn't a JSON object. */
export function parseBody(body: string): Payload | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" ? (parsed as Payload) : undefined;
  } catch {
    return undefined;
  }
}

/** One operation's result: its data, or the GraphQL or action error it reported. */
export function toData(payload: Payload | undefined, status: number, operationName: string | undefined): Record<string, unknown> {
  if (!payload) throw new HardcoverError("Response was not valid JSON", { status, operationName });

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new GraphQLError(payload.errors.map(toErrorDetail), payload.data ?? null, { status, operationName });
  }

  const data = payload.data ?? {};
  assertNoActionErrors(data, operationName);

  return data;
}

/** Maps a non-2xx response onto the shared taxonomy. Undefined for a 2xx. */
export function classify(
  response: HttpResponse,
  payload: Payload | undefined,
  rateLimit: RateLimitState | undefined,
  operationName: string | undefined,
): HardcoverError | undefined {
  const { status } = response;
  if (status >= 200 && status < 300) return undefined;

  // The gateway, Hasura and Rails each put the message somewhere different.
  const code = str(payload?.error);
  const firstError = Array.isArray(payload?.errors) ? str(payload.errors[0]) : undefined;
  const message = str(payload?.error_description) ?? str(payload?.message) ?? code ?? firstError ?? `HTTP ${status}`;
  const options = { status, operationName };

  if (status === 401) return new AuthenticationError(message, options);

  if (status === 403) {
    // `scope` lists every missing scope, space-separated (graphql_controller.rb).
    if (code === "insufficient_scope") {
      return new ScopeError(message, (str(payload?.scope) ?? "").split(/\s+/).filter(Boolean), options);
    }

    if (code === "unsupported_operation") return new UnsupportedOperationError(message, options);

    if (code === "top_level_limit_exceeded" || firstError === "request_exceeds_capacity") {
      return new RequestTooLargeError(message, options);
    }

    return new HardcoverError(message, options);
  }

  if (status === 400) return new InvalidRequestError(message, options);
  if (status === 408) return new TimeoutError(message, false, options);
  if (status === 429) return rateLimitError(response, message, rateLimit, options);
  if (status >= 500) return new ServerError(message, options);

  return new HardcoverError(message, options);
}

// Which window ran out decides how long to wait: the daily cap or the burst.
function rateLimitError(
  response: HttpResponse,
  message: string,
  rateLimit: RateLimitState | undefined,
  options: { status: number; operationName: string | undefined },
): RateLimitError {
  const dailySpent = rateLimit?.daily?.remaining === 0;
  const window = dailySpent ? "daily" : "burst";
  const bucket = dailySpent ? rateLimit?.daily : rateLimit?.burst;

  // Prefer the server's Retry-After; fall back to the bucket's reset time.
  const retryAfter = Number(response.headers["retry-after"]);
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : (bucket?.resetSeconds ?? 1);

  return new RateLimitError(message, retryAfterSeconds, window, bucket?.limit, bucket?.remaining, options);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toErrorDetail(raw: unknown) {
  const error = (raw ?? {}) as { message?: unknown; extensions?: { path?: unknown; code?: unknown } };

  return {
    message: str(error.message) ?? "Unknown GraphQL error",
    path: str(error.extensions?.path),
    code: str(error.extensions?.code),
  };
}

// Hasura actions report failures inside `data` with HTTP 200, as either
// `error: String` or `errors: [String]`.
function assertNoActionErrors(data: Record<string, unknown>, operationName: string | undefined): void {
  for (const [field, value] of Object.entries(data)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const envelope = value as { error?: unknown; errors?: unknown };
    const messages: string[] = [];

    if (typeof envelope.error === "string" && envelope.error) messages.push(envelope.error);
    if (Array.isArray(envelope.errors)) messages.push(...envelope.errors.map(String));

    if (messages.length > 0) throw new ActionError(field, messages, data, { operationName });
  }
}
