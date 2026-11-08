import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/http.js";
import { nextFreeSlots } from "../lib/ranking.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

/** "My hospitals": a patient's saved hospitals, for one-tap rebooking. */
export const savedRouter = Router();
savedRouter.use(requireAuth, requireRole("USER"));

savedRouter.get("/", async (req, res) => {
  const rows = await prisma.savedHospital.findMany({
    where: { userId: req.user.id, hospital: { verified: true } },
    orderBy: { createdAt: "desc" },
    include: { hospital: true },
  });
  const next = await nextFreeSlots(rows.map((r) => r.hospitalId));
  res.json({
    hospitals: rows.map((r) => ({ ...r.hospital, distanceKm: null, etaMinutes: null, sponsored: false, nextSlotAt: next.get(r.hospitalId) ?? null, savedAt: r.createdAt })),
  });
});

savedRouter.put("/:hospitalId", async (req, res) => {
  const hospital = await prisma.hospital.findUnique({ where: { id: String(req.params.hospitalId) } });
  if (!hospital || !hospital.verified) throw notFound("Hospital");
  await prisma.savedHospital.upsert({
    where: { userId_hospitalId: { userId: req.user.id, hospitalId: hospital.id } },
    create: { userId: req.user.id, hospitalId: hospital.id },
    update: {},
  });
  res.status(204).end();
});

savedRouter.delete("/:hospitalId", async (req, res) => {
  await prisma.savedHospital.deleteMany({ where: { userId: req.user.id, hospitalId: String(req.params.hospitalId) } });
  res.status(204).end();
});
