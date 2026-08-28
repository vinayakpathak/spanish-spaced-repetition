/** Minimal bindings used by the local vinext worker and optional starter DB helper. */
interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  prepare(query: string): unknown;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    [binding: string]: unknown;
  };
}
