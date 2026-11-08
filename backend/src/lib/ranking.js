import { prisma } from "./prisma.js";
import { ACTIVE_STATUSES, addDays, isPast, slotStart, slotsForDay, todayIST } from "./slots.js";

/**
 * Earliest free slot per hospital in the next `days` days (across all its doctors).
 * Returns Map<hospitalId, Date>.
 */
export async function nextFreeSlots(hospitalIds, days = 7) {
  const from = todayIST();
  const to = addDays(from, days - 1);
  const [doctors, booked, leaves] = await Promise.all([
    prisma.doctor.findMany({ where: { hospitalId: { in: hospitalIds } } }),
    prisma.appointment.findMany({
      where: { hospitalId: { in: hospitalIds }, date: { gte: from, lte: to }, status: { in: ACTIVE_STATUSES } },
      select: { doctorId: true, date: true, time: true },
    }),
    prisma.doctorLeave.findMany({ where: { doctor: { hospitalId: { in: hospitalIds } }, date: { gte: from, lte: to } } }),
  ]);
  const taken = new Set(booked.map((b) => `${b.doctorId}|${b.date}|${b.time}`));
  const leaveBy = new Map();
  for (const l of leaves) leaveBy.set(l.doctorId, [...(leaveBy.get(l.doctorId) ?? []), l.date]);

  const out = new Map();
  for (const d of doctors) {
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const free = slotsForDay(d, date, leaveBy.get(d.id)).find((t) => !isPast(date, t) && !taken.has(`${d.id}|${date}|${t}`));
      if (free) {
        const at = slotStart(date, free);
        const cur = out.get(d.hospitalId);
        if (!cur || at < cur) out.set(d.hospitalId, at);
        break;
      }
    }
  }
  return out;
}

/** Organic score, 0..1: distance 50%, rating 25%, soonest free slot 25%. */
export function organicScore(h, radiusKm) {
  const distance = h.distanceKm === null ? 0.5 : 1 - Math.min(h.distanceKm, radiusKm) / radiusKm;
  const rating = Math.min(1, Math.max(0, (h.rating - 3) / 2));
  const hoursAway = h.nextSlotAt ? (new Date(h.nextSlotAt).getTime() - Date.now()) / 3600_000 : 168;
  const soon = 1 - Math.min(Math.max(hoursAway, 0), 168) / 168;
  return 0.5 * distance + 0.25 * rating + 0.25 * soon;
}

export const SPONSOR_RULES = { maxLift: 3, radiusKm: 10, maxInTop5: 2 };

/**
 * Applies the capped sponsored boost to an organically ranked list.
 * A sponsored hospital (inside SPONSOR_RULES.radiusKm) moves up at most `maxLift` places,
 * and at most `maxInTop5` sponsored cards sit in the top 5. Only boosted cards are labelled.
 */
export function applySponsoredBoost(ranked, promoByHospital) {
  const eligible = (h) => promoByHospital.has(h.id) && h.distanceKm !== null && h.distanceKm <= SPONSOR_RULES.radiusKm;
  const organic = ranked.filter((h) => !eligible(h));
  const sponsored = ranked
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => eligible(h))
    .sort((a, b) => promoByHospital.get(b.h.id).priority - promoByHospital.get(a.h.id).priority || a.i - b.i);

  const out = [...organic];
  let inTop5 = 0;
  for (const { h, i } of sponsored) {
    let target = Math.max(0, i - SPONSOR_RULES.maxLift);
    if (target < 5 && inTop5 >= SPONSOR_RULES.maxInTop5) target = Math.max(target, Math.min(i, 5));
    target = Math.min(target, out.length);
    if (target < 5) inTop5++;
    const p = promoByHospital.get(h.id);
    out.splice(target, 0, { ...h, sponsored: true, highlight: p.highlight, promoTitle: p.title });
  }
  return out;
}
