/** URL slug from free text: "Sabarmati Care, Ahmedabad" → "sabarmati-care-ahmedabad". */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** First free slug, adding -2, -3… when taken. `exists(slug)` returns a promise of boolean. */
export async function uniqueSlug(base, exists) {
  const root = slugify(base) || "hospital";
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Calm tile colours for hospitals without a photo, chosen from the name so they stay stable. */
const TONES = ["#1747E5", "#0E7C86", "#5B3FD6", "#0B5CAD", "#2563EB", "#1E40AF", "#3B5BDB", "#0369A1"];
export function toneFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}
