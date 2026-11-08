import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError, notFound } from "../lib/http.js";
import { toneFor, uniqueSlug } from "../lib/slug.js";
import { audit, maskPhone } from "../lib/audit.js";
import { assertNoBannedClaims } from "../lib/claims.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

/** Platform admin (the developer/operator). */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/overview", async (_req, res) => {
  const now = new Date();
  const [users, hospitals, doctors, appointments, pending, activePromotions, byStatus, applications] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.hospital.count(),
    prisma.doctor.count(),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: { in: ["PENDING", "DOCTOR_APPROVED"] } } }), // waiting for approval
    prisma.promotion.count({ where: { active: true, archivedAt: null, startsAt: { lte: now }, endsAt: { gte: now } } }),
    prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.hospitalApplication.count({ where: { status: "PENDING" } }),
  ]);
  res.json({
    counts: { users, hospitals, doctors, appointments, pending, activePromotions, applications },
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
      accreditations: z.array(z.enum(["NABH", "NABL", "JCI"])).max(3).optional(),
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
  const hospital = await prisma.hospital.update({ where: { id: h.id }, data });
  await audit(prisma, req, "hospital.update", { target: h.id, meta: data });
  res.json({ hospital });
});

/** Recent sign-ups. Viewing patient data is logged, and numbers are masked. */
adminRouter.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, hospital: { select: { name: true } } },
  });
  await audit(prisma, req, "users.view", { meta: { count: users.length } });
  res.json({ users: users.map((u) => ({ ...u, phone: maskPhone(u.phone) })) });
});

adminRouter.get("/promotions", async (_req, res) => {
  const promotions = await prisma.promotion.findMany({
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { active: "desc" }, { priority: "desc" }],
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
    data: { ...data, createdById: req.user.id },
    include: { hospital: { select: { id: true, name: true, city: true, slug: true } } },
  });
  await audit(prisma, req, "promotion.create", { target: promotion.id, meta: { hospitalId: data.hospitalId, startsAt: data.startsAt, endsAt: data.endsAt, priority: data.priority } });
  res.status(201).json({ promotion });
});

adminRouter.patch("/promotions/:id", async (req, res) => {
  const data = z
    .object({ active: z.boolean().optional(), priority: z.coerce.number().int().min(1).max(10).optional() })
    .parse(req.body);
  const p = await prisma.promotion.findUnique({ where: { id: String(req.params.id) } });
  if (!p) throw notFound("Promotion");
  if (p.archivedAt) throw new HttpError(409, "Archived promotions can't be changed");
  const promotion = await prisma.promotion.update({
    where: { id: p.id },
    data,
    include: { hospital: { select: { id: true, name: true, city: true, slug: true } } },
  });
  await audit(prisma, req, "promotion.update", { target: p.id, meta: data });
  res.json({ promotion });
});

/** "Delete" archives: the promotion stops showing, but its record (dates, placement, who) is kept. */
adminRouter.delete("/promotions/:id", async (req, res) => {
  const p = await prisma.promotion.findUnique({ where: { id: String(req.params.id) } });
  if (!p) throw notFound("Promotion");
  if (!p.archivedAt) {
    await prisma.promotion.update({ where: { id: p.id }, data: { archivedAt: new Date(), active: false } });
    await audit(prisma, req, "promotion.archive", { target: p.id });
  }
  res.status(204).end();
});

/* ---------------- Hospital applications ---------------- */

adminRouter.get("/applications", async (req, res) => {
  const { status } = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() }).parse(req.query);
  const applications = await prisma.hospitalApplication.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  res.json({ applications });
});

/**
 * Approve: creates the hospital (live and verified) and the desk account the applicant
 * asked for, in one transaction. The applicant logs in with their mobile number by OTP.
 */
adminRouter.post("/applications/:id/approve", async (req, res) => {
  const app = await prisma.hospitalApplication.findUnique({ where: { id: String(req.params.id) } });
  if (!app) throw notFound("Application");
  if (app.status !== "PENDING") throw new HttpError(409, `This application was already ${app.status.toLowerCase()}`);
  const clash = await prisma.user.findFirst({ where: { OR: [{ email: app.contactEmail }, { phone: app.contactPhone }] } });
  if (clash) throw new HttpError(409, "The applicant's email or mobile is now used by another account. Reject and ask them to reapply");

  const slug = await uniqueSlug(`${app.hospitalName} ${app.city}`, async (s) => Boolean(await prisma.hospital.findUnique({ where: { slug: s } })));

  const result = await prisma.$transaction(async (tx) => {
    const hospital = await tx.hospital.create({
      data: {
        slug,
        name: app.hospitalName,
        description: app.description,
        address: app.address,
        city: app.city,
        state: app.state,
        pincode: app.pincode,
        phone: app.phone,
        lat: app.lat,
        lng: app.lng,
        specialties: app.specialties,
        beds: app.beds ?? 0,
        emergency24x7: app.emergency24x7,
        registrationNo: app.registrationNo,
        hfrId: app.hfrId,
        tone: toneFor(app.hospitalName),
        rating: 0,
        reviewCount: 0,
        verified: true,
      },
    });
    const user = await tx.user.create({
      data: {
        name: app.contactName,
        email: app.contactEmail,
        phone: app.contactPhone,
        role: "HOSPITAL",
        hospitalId: hospital.id,
        consentAt: app.consentAt,
        consentVersion: "hospital-terms-2026-11",
      },
    });
    await tx.hospitalApplication.update({
      where: { id: app.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: req.user.id, hospitalId: hospital.id },
    });
    return { hospital: { id: hospital.id, slug: hospital.slug, name: hospital.name }, deskLogin: user.phone };
  });
  await audit(prisma, req, "application.approve", { target: app.id, meta: { hospitalId: result.hospital.id } });
  res.json(result);
});

adminRouter.post("/applications/:id/reject", async (req, res) => {
  const { note } = z.object({ note: z.string().trim().min(3, "Give the applicant a reason").max(300) }).parse(req.body);
  const app = await prisma.hospitalApplication.findUnique({ where: { id: String(req.params.id) } });
  if (!app) throw notFound("Application");
  if (app.status !== "PENDING") throw new HttpError(409, `This application was already ${app.status.toLowerCase()}`);
  const updated = await prisma.hospitalApplication.update({
    where: { id: app.id },
    data: { status: "REJECTED", reviewNote: note, reviewedAt: new Date(), reviewedById: req.user.id },
  });
  await audit(prisma, req, "application.reject", { target: app.id, meta: { note } });
  res.json({ application: updated });
});

/* ---------------- Text messages ---------------- */

/** Delivery health for the last 7 days, plus SMS per booking (the cost driver) and recent problems. */
adminRouter.get("/messages", async (_req, res) => {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [byStatus, byKind, bookings, problems] = await Promise.all([
    prisma.outboundMessage.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.outboundMessage.groupBy({ by: ["kind", "status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.appointment.count({ where: { createdAt: { gte: since } } }),
    prisma.outboundMessage.findMany({
      where: { status: { in: ["FAILED", "SKIPPED"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, kind: true, phone: true, status: true, attempts: true, lastError: true, createdAt: true },
    }),
  ]);
  const status = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const kinds = {};
  for (const r of byKind) (kinds[r.kind] ??= {})[r.status] = r._count._all;
  const sent = status.SENT ?? 0;
  res.json({
    since,
    status,
    kinds,
    bookings,
    smsPerBooking: bookings ? Math.round((sent / bookings) * 100) / 100 : 0,
    // Mask numbers in admin lists (DPDP: show only what's needed)
    problems: problems.map((p) => ({ ...p, phone: `${p.phone.slice(0, 2)}******${p.phone.slice(-2)}` })),
  });
});

/* ---------------- Doctor registration checks ---------------- */

adminRouter.get("/hospitals/:id/doctors", async (req, res) => {
  const doctors = await prisma.doctor.findMany({
    where: { hospitalId: String(req.params.id) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, specialty: true, qualification: true, registrationNo: true, registrationVerifiedAt: true, active: true },
  });
  res.json({ doctors });
});

/** Mark a doctor's council/HPR number as checked against the registry (or undo). */
adminRouter.patch("/doctors/:id", async (req, res) => {
  const { verified } = z.object({ verified: z.boolean() }).parse(req.body);
  const d = await prisma.doctor.findUnique({ where: { id: String(req.params.id) } });
  if (!d) throw notFound("Doctor");
  if (verified && !d.registrationNo) throw new HttpError(400, "This doctor has no registration number to verify");
  const doctor = await prisma.doctor.update({ where: { id: d.id }, data: { registrationVerifiedAt: verified ? new Date() : null } });
  await audit(prisma, req, verified ? "doctor.verify" : "doctor.unverify", { target: d.id, meta: { registrationNo: d.registrationNo } });
  res.json({ doctor });
});

/* ---------------- Audit log ---------------- */

adminRouter.get("/audit", async (_req, res) => {
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(entries.map((e) => e.actorId))] } }, select: { id: true, name: true } });
  const name = Object.fromEntries(actors.map((a) => [a.id, a.name]));
  res.json({ entries: entries.map((e) => ({ ...e, actorName: name[e.actorId] ?? "Deleted user" })) });
});

/* ---------------- Incidents (breach log) ---------------- */

/** CERT-In: report cyber incidents within 6 hours of noticing. DPDP Board: personal-data breaches within 72 hours. */
export const INCIDENT_DEADLINES = { certInHours: 6, boardHours: 72 };

adminRouter.get("/incidents", async (_req, res) => {
  const incidents = await prisma.incident.findMany({ orderBy: [{ status: "asc" }, { detectedAt: "desc" }], take: 100 });
  res.json({ incidents, deadlines: INCIDENT_DEADLINES });
});

adminRouter.post("/incidents", async (req, res) => {
  const data = z
    .object({
      title: z.string().trim().min(5, "Describe it in a few words").max(120),
      description: z.string().trim().min(10, "Say what happened and what data was involved").max(2000),
      detectedAt: z.coerce.date().refine((d) => d.getTime() <= Date.now() + 60_000, "Detection time can't be in the future"),
      affectedPeople: z.coerce.number().int().min(0).optional(),
    })
    .parse(req.body);
  const incident = await prisma.incident.create({ data: { ...data, createdById: req.user.id } });
  await audit(prisma, req, "incident.create", { target: incident.id });
  res.status(201).json({ incident });
});

adminRouter.patch("/incidents/:id", async (req, res) => {
  const data = z
    .object({
      status: z.enum(["OPEN", "REPORTED", "CLOSED"]).optional(),
      reportedToCertInAt: z.coerce.date().nullable().optional(),
      reportedToBoardAt: z.coerce.date().nullable().optional(),
      peopleNotifiedAt: z.coerce.date().nullable().optional(),
      notes: z.string().trim().max(2000).nullable().optional(),
    })
    .parse(req.body);
  const i = await prisma.incident.findUnique({ where: { id: String(req.params.id) } });
  if (!i) throw notFound("Incident");
  const incident = await prisma.incident.update({ where: { id: i.id }, data });
  await audit(prisma, req, "incident.update", { target: i.id, meta: data });
  res.json({ incident });
});
