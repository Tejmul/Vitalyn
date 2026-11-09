import { todayIST } from "./slots.js";

/** Add 1 to today's impressions | clicks | bookings for a promotion (atomic upsert). */
export function bumpPromo(db, promotionId, field) {
  const date = todayIST();
  return db.promotionStat.upsert({
    where: { promotionId_date: { promotionId, date } },
    create: { promotionId, date, [field]: 1 },
    update: { [field]: { increment: 1 } },
  });
}

/** All-time totals per promotion: Map<promotionId, { impressions, clicks, bookings }>. */
export async function promoTotals(db, promotionIds) {
  const rows = await db.promotionStat.groupBy({
    by: ["promotionId"],
    where: { promotionId: { in: promotionIds } },
    _sum: { impressions: true, clicks: true, bookings: true },
  });
  return new Map(rows.map((r) => [r.promotionId, { impressions: r._sum.impressions ?? 0, clicks: r._sum.clicks ?? 0, bookings: r._sum.bookings ?? 0 }]));
}
