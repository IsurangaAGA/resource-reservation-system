import type { ApiErrorBody } from "./errors";

/** Error thrown by apiRequest, carrying the API's structured error body. */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody["error"],
  ) {
    super(body.message);
    this.name = "ApiClientError";
  }
}

/** Typed fetch wrapper for the app's own JSON API (browser-side). */
export async function apiRequest<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiClientError(0, { code: "INTERNAL_ERROR", message: "Network error. Check your connection and try again." });
  }

  if (response.status === 401 && typeof window !== "undefined") {
    // Session expired: send the user to sign in and come back here afterwards.
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // A full page load (not router.push) is intended: it drops all client state of the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${next}`);
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      (payload as ApiErrorBody | null)?.error ?? { code: "INTERNAL_ERROR", message: `Request failed (${response.status})` },
    );
  }
  return (payload as { data: T }).data;
}

export function toApiError(error: unknown): ApiClientError {
  return error instanceof ApiClientError
    ? error
    : new ApiClientError(0, { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
}
