import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/http.js";
import { assertNoBannedClaims } from "../lib/claims.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

/** Platform admin (the developer/operator). */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/overview", async (_req, res) => {
  const now = new Date();
  const [users, hospitals, doctors, appointments, pending, activePromotions, byStatus] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.hospital.count(),
    prisma.doctor.count(),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: { in: ["PENDING", "DOCTOR_APPROVED"] } } }),
    prisma.promotion.count({ where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } } }),
    prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  res.json({
    counts: { users, hospitals, doctors, appointments, pending, activePromotions },
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
  });
});

/** Every hospital with bookings, cancellations, no-shows and expiries, so the admin can spot problems. */
adminRouter.get("/hospitals", async (_req, res) => {
  const [hospitals, byStatus] = await Promise.all([
    prisma.hospital.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { doctors: true, appointments: true, events: true } } },
    }),
    prisma.appointment.groupBy({ by: ["hospitalId", "status"], _count: { _all: true } }),
  ]);
  const stats = new Map();
  for (const r of byStatus) {
    const s = stats.get(r.hospitalId) ?? {};
    s[r.status] = r._count._all;
    stats.set(r.hospitalId, s);
  }
  res.json({
    hospitals: hospitals.map((h) => {
      const s = stats.get(h.id) ?? {};
      return { ...h, stats: { cancelled: s.CANCELLED ?? 0, noShow: s.NO_SHOW ?? 0, expired: s.EXPIRED ?? 0, arrived: s.COMPLETED ?? 0 } };
    }),
  });
});

adminRouter.patch("/hospitals/:id", async (req, res) => {
  const data = z
    .object({
      verified: z.boolean().optional(),
      registrationNo: z.string().trim().max(60).optional().nullable(),
      // ABDM Health Facility Registry IDs look like IN0610000123
      hfrId: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^IN\d{10}$/, "HFR ID looks like IN0610000123")
        .optional()
        .nullable()
        .or(z.literal("").transform(() => null)),
    })
    .parse(req.body);
  const h = await prisma.hospital.findUnique({ where: { id: String(req.params.id) } });
  if (!h) throw notFound("Hospital");
  res.json({ hospital: await prisma.hospital.update({ where: { id: h.id }, data }) });
});

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      role: true,
      createdAt: true,
      hospital: { select: { name: true } },
    },
  });
  res.json({ users });
});

adminRouter.get("/promotions", async (_req, res) => {
  const promotions = await prisma.promotion.findMany({
    orderBy: [{ active: "desc" }, { priority: "desc" }],
    include: { hospital: { select: { id: true, name: true, city: true, slug: true } } },
  });
  res.json({ promotions });
});

const promoSchema = z
  .object({
    hospitalId: z.string().min(1, "Pick a hospital"),
    title: z.string().trim().min(3).max(80),
    highlight: z.string().trim().min(3).max(120),
    priority: z.coerce.number().int().min(1).max(10).default(1),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((p) => p.endsAt > p.startsAt, { message: "End date must be after the start", path: ["endsAt"] });

adminRouter.post("/promotions", async (req, res) => {
  const data = promoSchema.parse(req.body);
  assertNoBannedClaims({ "the campaign name": data.title, "the line patients see": data.highlight });
  const promotion = await prisma.promotion.create({
    data,
    include: { hospital: { select: { id: true, name: true, city: true, slug: true } } },
  });
  res.status(201).json({ promotion });
});

adminRouter.patch("/promotions/:id", async (req, res) => {
  const data = z
    .object({ active: z.boolean().optional(), priority: z.coerce.number().int().min(1).max(10).optional() })
    .parse(req.body);
  const p = await prisma.promotion.findUnique({ where: { id: String(req.params.id) } });
  if (!p) throw notFound("Promotion");
  res.json({
    promotion: await prisma.promotion.update({
      where: { id: p.id },
      data,
      include: { hospital: { select: { id: true, name: true, city: true, slug: true } } },
    }),
  });
});

adminRouter.delete("/promotions/:id", async (req, res) => {
  const p = await prisma.promotion.findUnique({ where: { id: String(req.params.id) } });
  if (!p) throw notFound("Promotion");
  await prisma.promotion.delete({ where: { id: p.id } });
  res.status(204).end();
});
