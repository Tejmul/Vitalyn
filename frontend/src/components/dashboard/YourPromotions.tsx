"use client";

import { useApi } from "@/lib/useApi";
import type { PromoStats } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "./bits";
import { PromoStatsLine } from "./PromoStatsLine";

type P = { id: string; title: string; highlight: string; startsAt: string; endsAt: string; active: boolean; archivedAt: string | null; stats: PromoStats };

/** A hospital's own sponsored placements and how they performed. Sold and edited by Vitalyn. */
export function YourPromotions() {
  const req = useApi<{ promotions: P[] }>("/manage/promotions");
  const rows = req.data?.promotions ?? [];
  if (rows.length === 0) return null;
  const now = new Date().toISOString();
  return (
    <Panel title="Your promotions">
      <p className="-mt-2 mb-3 text-[13.5px] text-muted">Views are times your sponsored card was shown; clicks opened your page from it; bookings were made after that click.</p>
      <ul className="divide-y divide-line">
        {rows.map((p) => {
          const live = p.active && !p.archivedAt && p.startsAt <= now && p.endsAt >= now;
          return (
            <li key={p.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-semibold">{p.title}</p>
                <Badge tone={live ? "green" : "grey"}>{live ? "Live" : p.archivedAt ? "Ended" : "Not running"}</Badge>
              </div>
              <p className="text-[13.5px] text-muted">{p.highlight}</p>
              <PromoStatsLine stats={p.stats} />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
