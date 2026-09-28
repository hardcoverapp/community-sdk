// Mirrors shared/errors.json. Names and hierarchy are canonical across SDKs.

export interface HardcoverErrorOptions {
  status?: number;
  cause?: unknown;
}

export class HardcoverError extends Error {
  readonly status: number | undefined;

  constructor(message: string, options: HardcoverErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.status = options.status;
  }
}

export class AuthenticationError extends HardcoverError {}

export class ScopeError extends HardcoverError {
  constructor(
    message: string,
    readonly requiredScope: string | undefined,
    options?: HardcoverErrorOptions,
  ) {
    super(message, options);
  }
}

export class UnsupportedOperationError extends HardcoverError {}

export class RequestTooLargeError extends HardcoverError {}

export type RateLimitWindow = "burst" | "daily";

export class RateLimitError extends HardcoverError {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
    readonly window: RateLimitWindow,
    readonly limit: number | undefined,
    readonly remaining: number | undefined,
    options?: HardcoverErrorOptions,
  ) {
    super(message, options);
  }
}

export class InvalidRequestError extends HardcoverError {}

export interface GraphQLErrorDetail {
  message: string;
  path: string | undefined;
  code: string | undefined;
}

export class GraphQLError extends HardcoverError {
  constructor(
    readonly errors: GraphQLErrorDetail[],
    /** Partial data Hasura returned alongside the errors, if any. */
    readonly data: unknown,
    options?: HardcoverErrorOptions,
  ) {
    super(errors.map((e) => e.message).join("; ") || "GraphQL error", options);
  }
}

/** A Hasura action returned HTTP 200 with a failure inside `data`. */
export class ActionError extends HardcoverError {
  constructor(
    readonly operation: string,
    readonly messages: string[],
    readonly data: unknown,
    options?: HardcoverErrorOptions,
  ) {
    super(`${operation}: ${messages.join("; ")}`, options);
  }
}

export class OAuthError extends HardcoverError {
  constructor(
    readonly code: string,
    readonly description: string | undefined,
    options?: HardcoverErrorOptions,
  ) {
    super(description ? `${code}: ${description}` : code, options);
  }
}

export class ServerError extends HardcoverError {}

/** Thrown for a server 408 or a client-side deadline. */
export class TimeoutError extends HardcoverError {
  constructor(
    message: string,
    /** True when a mutation timed out and the write may still have landed. */
    readonly mayHaveSucceeded = false,
    options?: HardcoverErrorOptions,
  ) {
    super(message, options);
  }
}

export class NetworkError extends HardcoverError {
  constructor(
    message: string,
    /** True when a mutation failed in flight and the write may still have landed. */
    readonly mayHaveSucceeded = false,
    options?: HardcoverErrorOptions,
  ) {
    super(message, options);
  }
}
