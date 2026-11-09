/**
 * Where to go after logging in. Only paths on this site are allowed: `//evil.com`,
 * `/\evil.com` and full URLs would send a freshly logged-in user to another site.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !/^\/(?![/\\])/.test(next) || /[\u0000-\u001f\\]/.test(next)) return fallback;
  try {
    const base = "https://vitalyn.invalid";
    const url = new URL(next, base);
    return url.origin === base ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
