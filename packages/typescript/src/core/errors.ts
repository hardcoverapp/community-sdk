// Mirrors shared/errors.json. Names and hierarchy are canonical across SDKs.

export interface HardcoverErrorOptions {
  status?: number;
  cause?: unknown;
  /** The GraphQL operation that failed, e.g. "AddUserBook". */
  operationName?: string;
}

export class HardcoverError extends Error {
  readonly status: number | undefined;
  /** The GraphQL operation that failed, when the request had one (e.g. "AddUserBook"). */
  readonly operationName: string | undefined;

  constructor(message: string, options: HardcoverErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.status = options.status;
    this.operationName = options.operationName;
  }
}

export class AuthenticationError extends HardcoverError {}

/**
 * The token lacks scopes this request needs. `missingScopes` lists every one,
 * exactly as the server reported them; ask the user to grant these.
 */
export class ScopeError extends HardcoverError {
  readonly missingScopes: string[];

  constructor(message: string, missingScopes: string[], options?: HardcoverErrorOptions) {
    super(message, options);
    this.missingScopes = missingScopes;
  }
}

export class UnsupportedOperationError extends HardcoverError {}

export class RequestTooLargeError extends HardcoverError {}

export type RateLimitWindow = "burst" | "daily";

export class RateLimitError extends HardcoverError {
  readonly retryAfterSeconds: number;
  readonly window: RateLimitWindow;
  readonly limit: number | undefined;
  readonly remaining: number | undefined;

  constructor(
    message: string,
    retryAfterSeconds: number,
    window: RateLimitWindow,
    limit: number | undefined,
    remaining: number | undefined,
    options?: HardcoverErrorOptions,
  ) {
    super(message, options);
    this.retryAfterSeconds = retryAfterSeconds;
    this.window = window;
    this.limit = limit;
    this.remaining = remaining;
  }
}

export class InvalidRequestError extends HardcoverError {}

export interface GraphQLErrorDetail {
  message: string;
  path: string | undefined;
  code: string | undefined;
}

export class GraphQLError extends HardcoverError {
  readonly errors: GraphQLErrorDetail[];
  /** Partial data Hasura returned alongside the errors, if any. */
  readonly data: unknown;

  constructor(errors: GraphQLErrorDetail[], data: unknown, options?: HardcoverErrorOptions) {
    super(errors.map((e) => e.message).join("; ") || "GraphQL error", options);
    this.errors = errors;
    this.data = data;
  }
}

/** A Hasura action returned HTTP 200 with a failure inside `data`. */
export class ActionError extends HardcoverError {
  readonly operation: string;
  readonly messages: string[];
  readonly data: unknown;

  constructor(operation: string, messages: string[], data: unknown, options?: HardcoverErrorOptions) {
    super(`${operation}: ${messages.join("; ")}`, options);
    this.operation = operation;
    this.messages = messages;
    this.data = data;
  }
}

/** Reserved for the OAuth helpers (planned; spec/03 Auth). Nothing raises it yet. */
export class OAuthError extends HardcoverError {
  readonly code: string;
  readonly description: string | undefined;

  constructor(code: string, description: string | undefined, options?: HardcoverErrorOptions) {
    super(description ? `${code}: ${description}` : code, options);
    this.code = code;
    this.description = description;
  }
}

/**
 * Something the method needed doesn't exist, e.g. updating a goal that isn't
 * there. Lookups that can find nothing (get, forBook, current) return null.
 */
export class NotFoundError extends HardcoverError {
  readonly resource: string;
  readonly id: number;

  constructor(resource: string, id: number, options?: HardcoverErrorOptions) {
    super(`${resource[0]!.toUpperCase()}${resource.slice(1)} ${id} not found`, options);
    this.resource = resource;
    this.id = id;
  }
}

export class ServerError extends HardcoverError {}

/** Thrown for a server 408 or a client-side deadline. */
export class TimeoutError extends HardcoverError {
  /** True when a mutation timed out and the write may still have landed. */
  readonly mayHaveSucceeded: boolean;

  constructor(message: string, mayHaveSucceeded = false, options?: HardcoverErrorOptions) {
    super(message, options);
    this.mayHaveSucceeded = mayHaveSucceeded;
  }
}

export class NetworkError extends HardcoverError {
  /** True when a mutation failed in flight and the write may still have landed. */
  readonly mayHaveSucceeded: boolean;

  constructor(message: string, mayHaveSucceeded = false, options?: HardcoverErrorOptions) {
    super(message, options);
    this.mayHaveSucceeded = mayHaveSucceeded;
  }
}
