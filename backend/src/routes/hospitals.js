import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/http.js";
import { distanceKm, etaMinutes } from "../lib/geo.js";
import { ACTIVE_STATUSES, isPast, slotsForDay, todayIST } from "../lib/slots.js";
import { SPONSOR_RULES, applySponsoredBoost, nextFreeSlots, organicScore } from "../lib/ranking.js";

export const hospitalsRouter = Router();

const coords = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

function withDistance(h, lat, lng) {
  if (lat === undefined || lng === undefined) return { ...h, distanceKm: null, etaMinutes: null };
  const km = distanceKm(lat, lng, h.lat, h.lng);
  return { ...h, distanceKm: Math.round(km * 10) / 10, etaMinutes: etaMinutes(km) };
}

const activePromo = () => {
  const now = new Date();
  return { active: true, startsAt: { lte: now }, endsAt: { gte: now } };
};

/**
 * All verified hospitals, nearest first. This list is purely organic: no paid boost.
 * `q` matches name, area/address, city, PIN code or a doctor's speciality.
 */
hospitalsRouter.get("/", async (req, res) => {
  const q = coords
    .extend({
      q: z.string().trim().optional(),
      specialty: z.string().trim().optional(),
      city: z.string().trim().optional(),
      radiusKm: z.coerce.number().positive().optional(),
    })
    .parse(req.query);
  const hospitals = await prisma.hospital.findMany({
    where: {
      verified: true,
      ...(q.city ? { city: { equals: q.city, mode: "insensitive" } } : {}),
      ...(q.specialty ? { specialties: { has: q.specialty } } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: "insensitive" } },
              { city: { contains: q.q, mode: "insensitive" } },
              { address: { contains: q.q, mode: "insensitive" } },
              { pincode: { startsWith: q.q.replace(/\s/g, "") } },
              { doctors: { some: { specialty: { contains: q.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { doctors: true, events: { where: { startsAt: { gte: new Date() } } } } } },
  });
  const next = await nextFreeSlots(hospitals.map((h) => h.id));
  let rows = hospitals.map((h) => ({ ...withDistance(h, q.lat, q.lng), sponsored: false, nextSlotAt: next.get(h.id) ?? null }));
  if (q.radiusKm && q.lat !== undefined) rows = rows.filter((h) => (h.distanceKm ?? 0) <= q.radiusKm);
  rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || b.rating - a.rating);
  res.json({ hospitals: rows });
});

/** Distinct specialties for the filter chips. */
hospitalsRouter.get("/specialties", async (_req, res) => {
  const all = await prisma.hospital.findMany({ where: { verified: true }, select: { specialties: true } });
  res.json({ specialties: [...new Set(all.flatMap((h) => h.specialties))].sort() });
});

/**
 * Top recommendations, following the ranking rule in the research doc:
 *  1. Filter: verified, within the radius, with a free slot in the next 7 days.
 *  2. Rank organically: distance 50%, rating 25%, soonest free slot 25%.
 *  3. Sponsored boost: up 3 places at most, only within 10 km, at most 2 in the top 5.
 *  4. Short list? Fill with the nearest hospitals further away.
 */
hospitalsRouter.get("/recommendations", async (req, res) => {
  const { lat, lng, radiusKm } = coords.extend({ radiusKm: z.coerce.number().positive().max(500).default(50) }).parse(req.query);
  const [hospitals, promos] = await Promise.all([
    prisma.hospital.findMany({ where: { verified: true } }),
    prisma.promotion.findMany({ where: activePromo() }),
  ]);
  const next = await nextFreeSlots(hospitals.map((h) => h.id));
  const rows = hospitals.map((h) => ({
    ...withDistance(h, lat, lng),
    nextSlotAt: next.get(h.id) ?? null,
    sponsored: false,
    highlight: h.tagline,
    promoTitle: null,
  }));

  const near = rows.filter((h) => h.nextSlotAt && (h.distanceKm === null || h.distanceKm <= radiusKm));
  near.sort((a, b) => organicScore(b, radiusKm) - organicScore(a, radiusKm));

  // Highest-priority live promotion per hospital
  const promoBy = new Map();
  for (const p of promos.sort((a, b) => b.priority - a.priority)) if (!promoBy.has(p.hospitalId)) promoBy.set(p.hospitalId, p);

  const ranked = applySponsoredBoost(near, promoBy);
  const taken = new Set(ranked.map((h) => h.id));
  const farther = rows
    .filter((h) => !taken.has(h.id) && h.nextSlotAt)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  res.json({ radiusKm, sponsorRules: SPONSOR_RULES, recommendations: [...ranked, ...farther].slice(0, 6) });
});

hospitalsRouter.get("/:slug", async (req, res) => {
  const { lat, lng } = coords.parse(req.query);
  const h = await prisma.hospital.findUnique({
    where: { slug: req.params.slug },
    include: {
      doctors: {
        orderBy: { experienceYears: "desc" },
        include: { leaves: { where: { date: { gte: todayIST() } }, select: { date: true } } },
      },
      events: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } },
    },
  });
  if (!h || !h.verified) throw notFound("Hospital");
  const next = await nextFreeSlots([h.id]);
  const doctors = h.doctors.map(({ leaves, ...d }) => ({ ...d, leaveDates: leaves.map((l) => l.date) }));
  res.json({ hospital: { ...withDistance({ ...h, doctors }, lat, lng), sponsored: false, nextSlotAt: next.get(h.id) ?? null } });
});

/** Slots for one doctor on one date, each marked available or not. */
hospitalsRouter.get("/doctors/:doctorId/slots", async (req, res) => {
  const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayIST()) }).parse(req.query);
  const doctor = await prisma.doctor.findUnique({ where: { id: req.params.doctorId } });
  if (!doctor) throw notFound("Doctor");
  const [taken, leave] = await Promise.all([
    prisma.appointment.findMany({ where: { doctorId: doctor.id, date, status: { in: ACTIVE_STATUSES } }, select: { time: true } }),
    prisma.doctorLeave.findUnique({ where: { doctorId_date: { doctorId: doctor.id, date } } }),
  ]);
  const takenSet = new Set(taken.map((t) => t.time));
  const slots = slotsForDay(doctor, date, leave ? [date] : []).map((time) => ({
    time,
    available: !takenSet.has(time) && !isPast(date, time),
  }));
  res.json({ date, doctorId: doctor.id, onLeave: Boolean(leave), slots });
});
