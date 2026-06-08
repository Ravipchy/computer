/**
 * Browser API requests with same-origin cookies (httpOnly session) and optional Bearer from localStorage.
 */

function clearStaffCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("auth_token");
    window.localStorage.removeItem("auth_user");
  } catch {
    /* ignore */
  }
}

function redirectForUnauthorized(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/admin")) {
    clearStaffCache();
    window.location.replace("/admin/login");
    return;
  }
  if (path.startsWith("/atc")) {
    clearStaffCache();
    window.location.replace("/atc/login");
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null;
  const rawUser = typeof window !== "undefined" ? window.localStorage.getItem("auth_user") : null;
  const bearer = raw?.trim() || "";
  let role: "admin" | "atc" | null = null;
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as { role?: "admin" | "atc" };
      role = parsed.role ?? null;
    } catch {
      role = null;
    }
  }

  const headers = new Headers(options.headers);
  const wantsAdmin = url.startsWith("/api/admin/");
  const wantsAtc = url.startsWith("/api/atc/");
  const roleMatches =
    (!wantsAdmin && !wantsAtc) ||
    (wantsAdmin && role === "admin") ||
    (wantsAtc && role === "atc");
  if (bearer && roleMatches && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    cache: options.cache ?? "no-store",
    headers,
  });
  const isStaffSessionProbe = url.startsWith("/api/admin/me") || url.startsWith("/api/atc/me");
  if ((response.status === 401 || response.status === 403) && isStaffSessionProbe) {
    redirectForUnauthorized();
  }
  return response;
}
