import { HttpError } from "./http.js";

/**
 * Words that make a health claim or superlative we can't publish.
 * NMC Ethical Advertising Guidelines (6 Oct 2026), ASCI code, and the
 * Drugs and Magic Remedies Act 1954 all bar these in hospital promotions.
 */
const BANNED = [
  /\bcure[sd]?\b/i,
  /\bguarantee[sd]?\b/i,
  /\bmiracle\b/i,
  /\b100\s?%/i,
  /\bbest\b/i,
  /\bno\.?\s?1\b/i,
  /\bnumber one\b/i,
  /\bpermanent(ly)?\s+(relief|solution)\b/i,
  /\brisk[- ]free\b/i,
];

/** Throws a 400 naming the first banned phrase found in any of the given fields. */
export function assertNoBannedClaims(fields) {
  for (const [name, text] of Object.entries(fields)) {
    if (!text) continue;
    for (const re of BANNED) {
      const m = String(text).match(re);
      if (m) {
        throw new HttpError(
          400,
          `"${m[0]}" can't be used in ${name}. Health claims and superlatives aren't allowed under NMC and ASCI rules`,
        );
      }
    }
  }
}
