const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The access token lives in memory only (never localStorage). It lasts 15 minutes; when it
 * runs out, the httpOnly refresh cookie gets a new one.
 */
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const session = {
  set: (t: string | null) => {
    accessToken = t;
  },
  get: () => accessToken,
  onLost: (fn: () => void) => {
    onSessionLost = fn;
  },
};

// Tidy up the token older versions kept in localStorage.
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("vitalyn.token");
  } catch {
    /* storage blocked */
  }
}

type Query = Record<string, string | number | undefined | null>;
type Opts = { method?: string; body?: unknown; query?: Query };

/**
 * Paths are written in code; query strings go in `opts.query`. A path with `..`, `?`, `#` or a
 * backslash means a value from the URL leaked into it unencoded and could aim the request (with
 * the user's token) at a different endpoint, so it is refused.
 */
function assertSafePath(path: string) {
  if (!path.startsWith("/") || /[?#\\]/.test(path) || /(^|\/)\.{1,2}(\/|$)/.test(path) || /%2e|%2f|%5c/i.test(path)) {
    throw new ApiError(400, "That link isn't valid");
  }
}

/** For values that go into a path segment (ids, slugs). */
export const seg = (v: string | number) => encodeURIComponent(String(v));

async function raw(path: string, opts: Opts, token: string | null): Promise<Response> {
  assertSafePath(path);
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  try {
    return await fetch(url, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: {
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach Vitalyn right now. Check your internet and try again");
  }
}

let refreshing: Promise<string | null> | null = null;

/** Swap the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<string | null> {
  refreshing ??= raw("/auth/refresh", { method: "POST" }, null)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      accessToken = data.accessToken;
      return data as { accessToken: string };
    })
    .then((d) => (d ? d.accessToken : null))
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  let res = await raw(path, opts, accessToken);
  // Expired access token: renew once and retry (never for the auth endpoints themselves).
  if (res.status === 401 && accessToken && !path.startsWith("/auth/")) {
    const fresh = await refreshSession();
    if (fresh) res = await raw(path, opts, fresh);
    else {
      accessToken = null;
      onSessionLost?.();
    }
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong. Please try again");
  return data as T;
}
