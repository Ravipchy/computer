"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authFetch } from "@/lib/auth-client";
import { requiresStaffSession } from "@/lib/staff-session";

export interface StaffUser {
  id: string;
  tpCode?: string;
  username?: string;
  email: string;
  role: "atc" | "admin";
  trainingPartnerName?: string;
}

interface AuthContextType {
  user: StaffUser | null;
  token: string | null;
  loading: boolean;
  /** True once we've finished trying to restore (or rejected) the staff session. */
  sessionReady: boolean;
  login: (token: string, user: StaffUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FALLBACK_AUTH_CONTEXT: AuthContextType = {
  user: null,
  token: null,
  loading: false,
  sessionReady: true,
  login: () => {
    // no-op fallback when provider is unexpectedly missing
  },
  logout: async () => {
    // no-op fallback when provider is unexpectedly missing
  },
  refreshUser: async () => {
    // no-op fallback when provider is unexpectedly missing
  },
};

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

type MeResult = {
  ok: boolean;
  user?: StaffUser;
  /** HTTP status. 0 = network error, 502 = bad JSON. */
  status: number;
};

/** Map a portal path to its `/me` endpoint. Returns null for non-staff pages. */
function meUrlForPath(pathname: string): "/api/admin/me" | "/api/atc/me" | null {
  if (pathname.startsWith("/admin")) return "/api/admin/me";
  if (pathname.startsWith("/atc")) return "/api/atc/me";
  return null;
}

async function tryStaffMe(
  url: "/api/atc/me" | "/api/admin/me",
  bearer: string | null,
): Promise<MeResult> {
  try {
    const res = await authFetch(url, bearer, { method: "GET" });
    const status = res.status;
    if (!res.ok) return { ok: false, status };

    let data: { user?: Record<string, unknown> };
    try {
      data = (await res.json()) as { user?: Record<string, unknown> };
    } catch {
      return { ok: false, status: 502 };
    }
    if (!data.user) return { ok: false, status };

    const role: "atc" | "admin" = url.includes("/admin/") ? "admin" : "atc";
    return {
      ok: true,
      status,
      user: { ...(data.user as Omit<StaffUser, "role">), role },
    };
  } catch {
    return { ok: false, status: 0 };
  }
}

function readCachedUser(): { user: StaffUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    const rawToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const parsed = rawUser ? (JSON.parse(rawUser) as StaffUser) : null;
    return { user: parsed, token: rawToken };
  } catch {
    return { user: null, token: null };
  }
}

function clearCachedSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<StaffUser | null>(() => readCachedUser().user);
  const [token, setToken] = useState<string | null>(() => readCachedUser().token);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const logout = useCallback(async () => {
    const role: "admin" | "atc" =
      user?.role ?? (pathname.startsWith("/admin") ? "admin" : "atc");

    clearCachedSession();
    setUser(null);
    setToken(null);

    try {
      await fetch(role === "admin" ? "/api/admin/logout" : "/api/atc/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }

    router.replace(role === "admin" ? "/admin/login" : "/atc/login");
  }, [user?.role, pathname, router]);

  const login = useCallback((newToken: string, newUser: StaffUser) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    }
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
    setSessionReady(true);
  }, []);

  const validate = useCallback(
    async (targetUrl: "/api/admin/me" | "/api/atc/me"): Promise<MeResult> => {
      const cookieResult = await tryStaffMe(targetUrl, null);
      if (cookieResult.ok) return cookieResult;
      if (cookieResult.status === 401) {
        const lsToken = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
        const lsUser =
          typeof window !== "undefined"
            ? localStorage.getItem(AUTH_USER_KEY)
            : null;
        let canUseBearer = false;
        if (lsUser) {
          try {
            const parsed = JSON.parse(lsUser) as StaffUser;
            const targetRole = targetUrl.includes("/admin/") ? "admin" : "atc";
            canUseBearer = parsed.role === targetRole;
          } catch {
            canUseBearer = false;
          }
        }
        if (lsToken && canUseBearer) {
          const bearerResult = await tryStaffMe(targetUrl, lsToken);
          if (bearerResult.ok) return bearerResult;
          if (bearerResult.status === 401) {
            clearCachedSession();
          }
          return bearerResult;
        }
      }
      return cookieResult;
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const role: "admin" | "atc" =
      user?.role ?? (pathname.startsWith("/admin") ? "admin" : "atc");
    const target: "/api/admin/me" | "/api/atc/me" =
      role === "admin" ? "/api/admin/me" : "/api/atc/me";

    const result = await validate(target);
    if (result.ok && result.user) {
      setUser(result.user);
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
      }
      return;
    }
    if (result.status === 401) {
      await logout();
    }
  }, [user?.role, pathname, logout, validate]);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (typeof window === "undefined") return;

      const target = meUrlForPath(pathname);
      if (!target || !requiresStaffSession(pathname)) {
        if (!cancelled) {
          setLoading(false);
          setSessionReady(true);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      const result = await validate(target);
      if (cancelled) return;

      if (result.ok && result.user) {
        setUser(result.user);
        if (typeof window !== "undefined") {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
        }
        setLoading(false);
        setSessionReady(true);
        return;
      }

      if (result.status === 401) {
        clearCachedSession();
        setUser(null);
        setToken(null);
      }
      // Network/server error: keep optimistic user so the UI doesn't bounce; still mark ready.
      setLoading(false);
      setSessionReady(true);
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [pathname, validate]);

  useEffect(() => {
    if (!sessionReady || loading) return;
    if (!requiresStaffSession(pathname)) return;
    if (user) return;

    router.replace(pathname.startsWith("/admin") ? "/admin/login" : "/atc/login");
  }, [user, loading, sessionReady, pathname, router]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, sessionReady, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (typeof window !== "undefined") {
      // Keep app usable in unexpected render paths (e.g. transient iframe/router states).
      console.error("useAuth used outside AuthProvider. Falling back to default auth state.");
    }
    return FALLBACK_AUTH_CONTEXT;
  }
  return context;
};
