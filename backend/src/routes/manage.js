import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { forbidden, HttpError, notFound } from "../lib/http.js";
import { assertNoBannedClaims } from "../lib/claims.js";
import { ACTIVE_STATUSES, nowHHMMIST, todayIST } from "../lib/slots.js";
import { indianMobile } from "../lib/schemas.js";
import { isSlotClash, logEvent, nextToken, smsVars, transition, withTokenRetry } from "../lib/transitions.js";
import { queueSms } from "../lib/notify.js";
import { callNext, doctorQueue } from "../lib/queue.js";
import { promoTotals } from "../lib/promoStats.js";
import { tokenCode } from "../lib/transitions.js";
import { requireAuth, requireManager, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { endAllSessions } from "../lib/session.js";


/**
 * Hospital front desk and doctor workspace.
 * HOSPITAL staff see their whole hospital; DOCTOR accounts see only their own patients.
 * Every hospital query is scoped by the hospitalId in the signed token.
 */
export const manageRouter = Router();
manageRouter.use(requireAuth, requireRole("HOSPITAL", "DOCTOR"));

async function scope(user) {
  if (!user?.hospitalId) throw forbidden("Your account isn't linked to a hospital yet");
  // Checked on every request so a removed staff member loses access at once, not when their token expires
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { disabledAt: true } });
  if (!me || me.disabledAt) throw new HttpError(401, "Your access has been removed. Ask your hospital manager");
  if (user.role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) throw forbidden("Your account isn't linked to a doctor profile yet");
    return { hospitalId: user.hospitalId, doctorId: doctor.id };
  }
  return { hospitalId: user.hospitalId, doctorId: undefined };
}

/** The doctor must belong to this hospital, and a DOCTOR account may only touch itself. */
async function ownDoctor(s, doctorId, { activeOnly = false } = {}) {
  const doc = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doc || doc.hospitalId !== s.hospitalId || (s.doctorId && s.doctorId !== doc.id)) throw notFound("Doctor");
  if (activeOnly && !doc.active) throw new HttpError(409, `${doc.name} is not taking patients right now`);
  return doc;
}

const apptInclude = {
  doctor: { select: { id: true, name: true, specialty: true } },
  user: { select: { id: true, name: true, phone: true, email: true } },
  profile: { select: { relation: true } },
};

manageRouter.get("/overview", async (req, res) => {
  const s = await scope(req.user);
  const base = { hospitalId: s.hospitalId, ...(s.doctorId ? { doctorId: s.doctorId } : {}) };
  const today = todayIST();
  const [hospital, pending, todayConfirmed, todayArrived, upcomingEvents, doctors] = await Promise.all([
    prisma.hospital.findUnique({ where: { id: s.hospitalId }, select: { id: true, name: true, slug: true, city: true } }),
    prisma.appointment.count({ where: { ...base, status: { in: ["PENDING", "DOCTOR_APPROVED"] } } }),
    prisma.appointment.count({ where: { ...base, status: "CONFIRMED", date: today } }),
    prisma.appointment.count({ where: { ...base, status: "COMPLETED", date: today } }),
    prisma.event.count({ where: { hospitalId: s.hospitalId, startsAt: { gte: new Date() } } }),
    prisma.doctor.count({ where: { hospitalId: s.hospitalId } }),
  ]);
  res.json({
    hospital,
    role: req.user.role,
    today,
    counts: { pending, todayConfirmed, todayArrived, upcomingEvents, doctors },
  });
});

const STATUSES = ["PENDING", "DOCTOR_APPROVED", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW", "EXPIRED"];

manageRouter.get("/appointments", async (req, res) => {
  const s = await scope(req.user);
  const q = z
    .object({ status: z.enum(STATUSES).optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
    .parse(req.query);
  const appointments = await prisma.appointment.findMany({
    where: {
      hospitalId: s.hospitalId,
      ...(s.doctorId ? { doctorId: s.doctorId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.date ? { date: q.date } : {}),
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: apptInclude,
    take: 300,
  });
  res.json({ appointments });
});

/** One button = one action. Allowed moves live in lib/transitions.js. */
manageRouter.post("/appointments/:id/action", async (req, res) => {
  const s = await scope(req.user);
  const { action, note } = z
    .object({
      action: z.enum(["accept", "reject", "arrive", "no_show"]),
      note: z.string().trim().max(300).optional(),
    })
    .parse(req.body);
  const updated = await withTokenRetry(() =>
    prisma.$transaction((tx) => transition(tx, String(req.params.id), action, { actorId: req.user.id, role: req.user.role, note, scope: s })),
  );
  res.json({ appointment: await prisma.appointment.findUnique({ where: { id: updated.id }, include: apptInclude }) });
});

/** Front desk took the consultation fee. */
manageRouter.post("/appointments/:id/paid", requireRole("HOSPITAL"), async (req, res) => {
  const s = await scope(req.user);
  const appt = await prisma.appointment.findUnique({ where: { id: String(req.params.id) } });
  if (!appt || appt.hospitalId !== s.hospitalId) throw notFound("Appointment");
  if (!["CONFIRMED", "COMPLETED"].includes(appt.status)) throw new HttpError(409, "Only confirmed visits can be marked paid");
  if (appt.paidAt) throw new HttpError(409, "Already marked paid");
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.appointment.update({ where: { id: appt.id }, data: { paidAt: new Date() }, include: apptInclude });
    await logEvent(tx, appt.id, { action: "paid", from: appt.status, to: appt.status, actorId: req.user.id });
    return u;
  });
  res.json({ appointment: updated });
});

/**
 * A patient walks up to the desk: name + phone, the next token, same queue as online bookings.
 * The time is "now", nudged forward a minute at a time if it collides with a booked slot.
 */
manageRouter.post("/walk-ins", requireRole("HOSPITAL"), async (req, res) => {
  const s = await scope(req.user);
  const data = z
    .object({
      doctorId: z.string().min(1, "Pick a doctor"),
      name: z.string().trim().min(2, "Enter the patient's name").max(80),
      phone: indianMobile.optional().or(z.literal("").transform(() => undefined)),
      age: z.coerce.number().int().min(0).max(120).optional(),
    })
    .parse(req.body);
  const doctor = await ownDoctor(s, data.doctorId, { activeOnly: true });
  const date = todayIST();
  let [h, m] = nowHHMMIST().split(":").map(Number);

  for (let attempt = 0; attempt < 60; attempt++) {
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    try {
      const appt = await prisma.$transaction(async (tx) => {
        const a = await tx.appointment.create({
          data: {
            date,
            time,
            patientName: data.name,
            patientAge: data.age,
            walkIn: true,
            walkInPhone: data.phone,
            status: "CONFIRMED",
            tokenNumber: await nextToken(tx, doctor.id, date),
            doctorId: doctor.id,
            hospitalId: s.hospitalId,
          },
          include: apptInclude,
        });
        await logEvent(tx, a.id, { action: "walk_in", to: "CONFIRMED", actorId: req.user.id });
        // Walk-ins with a mobile get their token by text too
        if (data.phone) {
          const hospital = await tx.hospital.findUnique({ where: { id: s.hospitalId }, select: { name: true } });
          await queueSms(tx, { phone: data.phone, kind: "CONFIRMED", vars: smsVars(a, doctor, hospital), appointmentId: a.id });
        }
        return a;
      });
      return res.status(201).json({ appointment: appt });
    } catch (e) {
      if (!isSlotClash(e)) throw e; // that minute is taken: try the next one
      m += 1;
      if (m === 60) [h, m] = [h + 1, 0];
      if (h > 23) break;
    }
  }
  throw new HttpError(409, "Couldn't find a free minute in the queue. Please try again");
});

/** Today's queue per doctor (desk sees all its doctors, a doctor sees their own). */
manageRouter.get("/queue", async (req, res) => {
  const s = await scope(req.user);
  const doctors = await prisma.doctor.findMany({
    where: { hospitalId: s.hospitalId, active: true, ...(s.doctorId ? { id: s.doctorId } : {}) },
    orderBy: { name: "asc" },
  });
  const queues = [];
  for (const d of doctors) {
    const q = await doctorQueue(prisma, d.id);
    if (!q.serving && q.waiting.length === 0) continue;
    queues.push({
      doctorId: d.id,
      doctorName: d.name,
      specialty: d.specialty,
      serving: q.serving ? { id: q.serving.id, token: tokenCode(q.serving.tokenNumber, d.name), patientName: q.serving.patientName } : null,
      next: q.waiting.slice(0, 3).map((w) => ({ id: w.id, token: tokenCode(w.tokenNumber, d.name), patientName: w.patientName })),
      waiting: q.waiting.length,
    });
  }
  res.json({ queues });
});

/** Call the next token for a doctor. */
manageRouter.post("/doctors/:id/call-next", async (req, res) => {
  const s = await scope(req.user);
  const doctor = await ownDoctor(s, String(req.params.id), { activeOnly: true });
  const hospital = await prisma.hospital.findUnique({ where: { id: s.hospitalId }, select: { name: true } });
  const result = await prisma.$transaction((tx) => callNext(tx, doctor, hospital.name));
  if (!result.called) throw new HttpError(409, `No one is waiting for ${doctor.name}`);
  res.json(result);
});

manageRouter.get("/doctors", async (req, res) => {
  const s = await scope(req.user);
  const doctors = await prisma.doctor.findMany({
    where: { hospitalId: s.hospitalId, ...(s.doctorId ? { id: s.doctorId } : {}) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { leaves: { where: { date: { gte: todayIST() } }, orderBy: { date: "asc" } } },
  });
  res.json({ doctors });
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

const doctorProfile = {
  name: z
    .string()
    .trim()
    .min(3, "Enter the doctor's name")
    .max(80)
    .transform((n) => (/^dr\.?\s/i.test(n) ? n.replace(/^dr\.?\s*/i, "Dr. ") : `Dr. ${n}`)),
  specialty: z.string().trim().min(2, "Pick a speciality").max(40),
  qualification: z.string().trim().min(2, "Enter qualifications, e.g. MBBS, MD").max(80),
  experienceYears: z.coerce.number().int().min(0).max(60),
  fee: z.coerce.number().int().min(0, "Fee can't be negative").max(100000),
  languages: z.array(z.string().trim().min(2).max(20)).min(1, "Pick at least one language").max(10),
  // State medical council or HPR number. Checked by the platform admin.
  registrationNo: z.string().trim().min(3, "Enter the council or HPR registration number").max(40),
};

/** Add a doctor. New doctors default to Mon–Sat, 9 AM–1 PM, 15-minute slots; the desk can change that. */
manageRouter.post("/doctors", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const data = z.object(doctorProfile).parse(req.body);
  const doctor = await prisma.doctor.create({ data: { ...data, hospitalId: s.hospitalId } });
  const hospital = await prisma.hospital.findUnique({ where: { id: s.hospitalId }, select: { specialties: true } });
  if (hospital && !hospital.specialties.includes(data.specialty)) {
    await prisma.hospital.update({ where: { id: s.hospitalId }, data: { specialties: { push: data.specialty } } });
  }
  res.status(201).json({ doctor });
});

/** Weekly schedule, slot length, approval mode and profile details, set by the hospital with buttons. */
manageRouter.patch("/doctors/:id", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const doc = await ownDoctor(s, String(req.params.id));
  const data = z
    .object({
      ...Object.fromEntries(Object.entries(doctorProfile).map(([k, v]) => [k, v.optional()])),
      active: z.boolean().optional(),
      autoConfirm: z.boolean().optional(),
      workingDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
      startTime: hhmm.optional(),
      endTime: hhmm.optional(),
      slotMinutes: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]).optional(),
    })
    .parse(req.body);
  const start = data.startTime ?? doc.startTime;
  const end = data.endTime ?? doc.endTime;
  if (end <= start) throw new HttpError(400, "OPD end time must be after the start time");
  if (data.workingDays) data.workingDays = [...new Set(data.workingDays)].sort();
  // The admin's "verified" check covers one registration number for one named doctor.
  // Changing either means it has to be checked again.
  const changed = (k) => data[k] !== undefined && data[k] !== doc[k];
  const recheck = doc.registrationVerifiedAt && (changed("registrationNo") || changed("name"));
  const doctor = await prisma.doctor.update({ where: { id: doc.id }, data: { ...data, ...(recheck ? { registrationVerifiedAt: null } : {}) } });
  res.json({ doctor, ...(recheck ? { notice: "Registration details changed, so the verified badge is off until the Vitalyn team checks them again" } : {}) });
});

/**
 * "Doctor on leave" for a date: slots disappear, and every active booking that day is
 * cancelled with the patient notified.
 */
manageRouter.post("/doctors/:id/leave", async (req, res) => {
  const s = await scope(req.user);
  const doc = await ownDoctor(s, String(req.params.id));
  const { date, reason } = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayIST()), reason: z.string().trim().max(120).optional() })
    .parse(req.body ?? {});
  if (date < todayIST()) throw new HttpError(400, "Pick today or a future date");

  const result = await prisma.$transaction(async (tx) => {
    await tx.doctorLeave.upsert({
      where: { doctorId_date: { doctorId: doc.id, date } },
      create: { doctorId: doc.id, date, reason },
      update: { reason },
    });
    const affected = await tx.appointment.findMany({
      where: { doctorId: doc.id, date, status: { in: ACTIVE_STATUSES } },
      select: { id: true },
    });
    for (const a of affected) {
      await transition(tx, a.id, "leave", { actorId: req.user.id, role: req.user.role, note: reason ? `Doctor on leave: ${reason}` : "Doctor on leave" });
    }
    return affected.length;
  });
  res.status(201).json({ date, cancelled: result });
});

manageRouter.delete("/doctors/:id/leave/:date", async (req, res) => {
  const s = await scope(req.user);
  const doc = await ownDoctor(s, String(req.params.id));
  await prisma.doctorLeave.deleteMany({ where: { doctorId: doc.id, date: String(req.params.date) } });
  res.status(204).end();
});

/** The hospital's own promotions with their numbers (read-only; the platform sells and edits them). */
manageRouter.get("/promotions", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const promotions = await prisma.promotion.findMany({
    where: { hospitalId: s.hospitalId },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true, highlight: true, startsAt: true, endsAt: true, active: true, archivedAt: true },
  });
  const totals = await promoTotals(prisma, promotions.map((p) => p.id));
  res.json({ promotions: promotions.map((p) => ({ ...p, stats: totals.get(p.id) ?? { impressions: 0, clicks: 0, bookings: 0 } })) });
});

/** The hospital's own public profile. Name, address and registry IDs are changed by the platform admin. */
manageRouter.get("/hospital", async (req, res) => {
  const s = await scope(req.user);
  const hospital = await prisma.hospital.findUnique({ where: { id: s.hospitalId } });
  res.json({ hospital });
});

manageRouter.patch("/hospital", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const data = z
    .object({
      tagline: z.string().trim().max(80).optional().nullable(),
      description: z.string().trim().min(20, "Tell patients a little more (20+ characters)").max(600).optional(),
      phone: z.string().trim().min(8).max(20).optional(),
      // WhatsApp for the front desk; empty string clears it
      whatsapp: indianMobile.nullable().optional().or(z.literal("").transform(() => null)),
      beds: z.coerce.number().int().min(0).max(5000).optional(),
      emergency24x7: z.boolean().optional(),
      specialties: z.array(z.string().trim().min(2).max(40)).min(1).max(30).optional(),
    })
    .parse(req.body);
  assertNoBannedClaims({ "the tagline": data.tagline, "the description": data.description });
  res.json({ hospital: await prisma.hospital.update({ where: { id: s.hospitalId }, data }) });
});

manageRouter.get("/events", async (req, res) => {
  const s = await scope(req.user);
  const events = await prisma.event.findMany({ where: { hospitalId: s.hospitalId }, orderBy: { startsAt: "desc" } });
  res.json({ events });
});

const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(1000),
    type: z.enum(["HEALTH_CAMP", "WORKSHOP", "DRIVE", "SCREENING", "TALK"]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    venue: z.string().trim().min(2).max(120),
    isFree: z.boolean().default(true),
    seats: z.coerce.number().int().positive().optional(),
  })
  .refine((e) => e.endsAt > e.startsAt, { message: "End time must be after the start", path: ["endsAt"] });

manageRouter.post("/events", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const data = eventSchema.parse(req.body);
  assertNoBannedClaims({ "the title": data.title, "the description": data.description });
  const event = await prisma.event.create({ data: { ...data, hospitalId: s.hospitalId } });
  res.status(201).json({ event });
});

manageRouter.delete("/events/:id", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const ev = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
  if (!ev || ev.hospitalId !== s.hospitalId) throw notFound("Event");
  await prisma.event.delete({ where: { id: ev.id } });
  res.status(204).end();
});


/* ---------------- Staff (managers only) ---------------- */

manageRouter.get("/staff", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const staff = await prisma.user.findMany({
    where: { hospitalId: s.hospitalId, role: { in: ["HOSPITAL", "DOCTOR"] } },
    orderBy: [{ disabledAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    select: { id: true, name: true, phone: true, role: true, staffRole: true, disabledAt: true, createdAt: true, doctor: { select: { id: true, name: true } } },
  });
  res.json({ staff });
});

/** Add a manager, a receptionist, or a doctor's own login (linked to an existing doctor). They log in by OTP. */
manageRouter.post("/staff", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const data = z
    .object({
      name: z.string().trim().min(2, "Enter their name").max(80),
      phone: indianMobile,
      kind: z.enum(["MANAGER", "RECEPTION", "DOCTOR"]),
      doctorId: z.string().optional(),
    })
    .refine((d) => d.kind !== "DOCTOR" || d.doctorId, { message: "Pick which doctor this login is for", path: ["doctorId"] })
    .parse(req.body);

  if (await prisma.user.findUnique({ where: { phone: data.phone } })) {
    throw new HttpError(409, "This mobile number already has a Vitalyn account. Use another number for work");
  }
  let doctor = null;
  if (data.kind === "DOCTOR") {
    doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor || doctor.hospitalId !== s.hospitalId) throw notFound("Doctor");
    if (doctor.userId) throw new HttpError(409, `${doctor.name} already has a login`);
  }
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        role: data.kind === "DOCTOR" ? "DOCTOR" : "HOSPITAL",
        staffRole: data.kind === "DOCTOR" ? null : data.kind,
        hospitalId: s.hospitalId,
      },
    });
    if (doctor) await tx.doctor.update({ where: { id: doctor.id }, data: { userId: u.id } });
    return u;
  });
  await audit(prisma, req, "staff.create", { target: user.id, meta: { kind: data.kind } });
  res.status(201).json({ staff: { id: user.id, name: user.name, phone: user.phone, role: user.role, staffRole: user.staffRole } });
});

/** Turn someone's access off (or back on). Turning off ends their sessions immediately. */
manageRouter.patch("/staff/:id", requireManager, async (req, res) => {
  const s = await scope(req.user);
  const { disabled } = z.object({ disabled: z.boolean() }).parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target || target.hospitalId !== s.hospitalId || !["HOSPITAL", "DOCTOR"].includes(target.role)) throw notFound("Staff member");
  if (target.id === req.user.id) throw new HttpError(400, "You can't turn off your own access");
  if (disabled && target.staffRole === "MANAGER") {
    const managers = await prisma.user.count({ where: { hospitalId: s.hospitalId, staffRole: "MANAGER", disabledAt: null } });
    if (managers <= 1) throw new HttpError(400, "A hospital needs at least one active manager");
  }
  await prisma.user.update({ where: { id: target.id }, data: { disabledAt: disabled ? new Date() : null } });
  if (disabled) await endAllSessions(target.id);
  await audit(prisma, req, disabled ? "staff.disable" : "staff.enable", { target: target.id });
  res.status(204).end();
});
