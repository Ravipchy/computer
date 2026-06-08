/**
 * Client-side fetch helpers for cookie-based (httpOnly) staff sessions.
 * Always sends same-origin cookies; adds Authorization when a token is available (e.g. legacy localStorage).
 */

export function authFetch(
  input: RequestInfo | URL,
  token: string | null | undefined,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const t = typeof token === "string" ? token.trim() : "";
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}

/** Same-origin cookie session (student portal, public APIs that need cookies). */
export function cookieFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}
