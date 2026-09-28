export interface HttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface HttpResponse {
  status: number;
  /** Header names are lowercased. */
  headers: Record<string, string>;
  body: string;
}

export interface Transport {
  send(request: HttpRequest): Promise<HttpResponse>;
}

/** The request never produced a response. `kind` decides which HardcoverError it becomes. */
export class TransportFailure extends Error {
  constructor(
    readonly kind: "network" | "timeout",
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "TransportFailure";
  }
}

// AbortController + setTimeout instead of AbortSignal.timeout(), which some
// React Native (Hermes) versions lack. The timer covers reading the body too.
export function fetchTransport({ timeoutMs = 35_000 }: { timeoutMs?: number } = {}): Transport {
  return {
    async send(request) {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      try {
        const response = await fetch(request.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
        return { status: response.status, headers, body: await response.text() };
      } catch (cause) {
        throw new TransportFailure(timedOut ? "timeout" : "network", String(cause), { cause });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
