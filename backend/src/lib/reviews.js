/** Recalculate a hospital's rating and count from its visible verified reviews. */
export async function recomputeRating(db, hospitalId) {
  const agg = await db.review.aggregate({ where: { hospitalId, hidden: false }, _avg: { rating: true }, _count: { _all: true } });
  const count = agg._count._all;
  await db.hospital.update({
    where: { id: hospitalId },
    data: { rating: count ? Math.round(agg._avg.rating * 10) / 10 : 0, reviewCount: count },
  });
}

/** "Riya Patel" → "Riya P." */
export const reviewerName = (full) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

/** Reviews can be left this many days after the visit. */
export const REVIEW_WINDOW_DAYS = 30;
