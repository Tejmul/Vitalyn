"use client";

import { api } from "./api";

/**
 * Promotion analytics, per browser session only (sessionStorage):
 * - a click is recorded once per promotion per session
 * - a booking at that same hospital later in the session is credited to it
 * Nothing personal is stored or sent.
 */
const KEY = "vitalyn.promo";

type Attribution = { slug: string; pid: string };

/** Promotion ids are cuids. Anything else in ?pid= is ignored, never put into an API path. */
export const isPromoId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{20,40}$/.test(v);

function read(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const a = raw ? (JSON.parse(raw) as Attribution) : null;
    return a && typeof a.slug === "string" && isPromoId(a.pid) ? a : null;
  } catch {
    return null;
  }
}

export function recordPromoVisit(slug: string, pid: string) {
  if (!isPromoId(pid)) return;
  try {
    const clickedKey = `${KEY}.clicked.${pid}`;
    sessionStorage.setItem(KEY, JSON.stringify({ slug, pid }));
    if (sessionStorage.getItem(clickedKey)) return;
    sessionStorage.setItem(clickedKey, "1");
  } catch {
    /* storage blocked: still count the click once */
  }
  api(`/promotions/${encodeURIComponent(pid)}/click`, { method: "POST" }).catch(() => {});
}

/** The promotion to credit for a booking at this hospital, if the patient came from its card. */
export function promoFor(slug: string): string | undefined {
  const a = read();
  return a && a.slug === slug ? a.pid : undefined;
}
