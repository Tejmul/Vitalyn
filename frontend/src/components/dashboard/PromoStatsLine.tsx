import type { PromoStats } from "@/lib/types";

/** "1,240 views · 56 clicks (4.5%) · 7 bookings" */
export function PromoStatsLine({ stats }: { stats?: PromoStats }) {
  const s = stats ?? { impressions: 0, clicks: 0, bookings: 0 };
  const ctr = s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(1) : null;
  return (
    <p className="mt-1 font-mono text-[12px] text-ink-2">
      {s.impressions.toLocaleString("en-IN")} views · {s.clicks.toLocaleString("en-IN")} clicks{ctr ? ` (${ctr}%)` : ""} · {s.bookings.toLocaleString("en-IN")} bookings
    </p>
  );
}
