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

function read(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export function recordPromoVisit(slug: string, pid: string) {
  try {
    const clickedKey = `${KEY}.clicked.${pid}`;
    sessionStorage.setItem(KEY, JSON.stringify({ slug, pid }));
    if (sessionStorage.getItem(clickedKey)) return;
    sessionStorage.setItem(clickedKey, "1");
  } catch {
    /* storage blocked: still count the click once */
  }
  api(`/promotions/${pid}/click`, { method: "POST" }).catch(() => {});
}

/** The promotion to credit for a booking at this hospital, if the patient came from its card. */
export function promoFor(slug: string): string | undefined {
  const a = read();
  return a && a.slug === slug ? a.pid : undefined;
}
