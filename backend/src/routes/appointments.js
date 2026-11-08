import { Router } from "express";
import { z } from "zod";
import prismaPkg from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError, notFound } from "../lib/http.js";
import { ACTIVE_STATUSES, isPast, slotStart, slotsForDay } from "../lib/slots.js";
import { approveDeadline, logEvent, transition } from "../lib/transitions.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const { Prisma } = prismaPkg;

/** Patient-side appointments. */
export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth, requireRole("USER"));

const include = {
  doctor: { select: { id: true, name: true, specialty: true, fee: true } },
  hospital: { select: { id: true, name: true, slug: true, address: true, city: true, phone: true, tone: true } },
  profile: { select: { id: true, name: true, relation: true } },
};

const slotSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
};

/** Throws unless `time` on `date` is a real, future, non-leave slot for this doctor. */
async function assertBookable(doctor, date, time) {
  const leave = await prisma.doctorLeave.findUnique({ where: { doctorId_date: { doctorId: doctor.id, date } } });
  if (leave) throw new HttpError(400, "The doctor is on leave that day. Pick another day");
  if (!slotsForDay(doctor, date).includes(time)) throw new HttpError(400, "That time isn't one of the doctor's slots");
  if (isPast(date, time)) throw new HttpError(400, "That slot has already passed. Pick a later one");
}

const slotTaken = (e) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

appointmentsRouter.post("/", async (req, res) => {
  const data = z
    .object({
      doctorId: z.string().min(1),
      ...slotSchema,
      profileId: z.string().min(1, "Choose who the appointment is for"),
      reason: z.string().trim().max(300).optional(),
    })
    .parse(req.body);

  const [doctor, profile] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: data.doctorId } }),
    prisma.patientProfile.findUnique({ where: { id: data.profileId } }),
  ]);
  if (!doctor) throw notFound("Doctor");
  if (!profile || profile.userId !== req.user.id) throw notFound("Family member");
  await assertBookable(doctor, data.date, data.time);

  try {
    const appt = await prisma.$transaction(async (tx) => {
      const status = doctor.autoApprove ? "DOCTOR_APPROVED" : "PENDING";
      const a = await tx.appointment.create({
        data: {
          date: data.date,
          time: data.time,
          reason: data.reason,
          patientName: profile.name,
          patientAge: profile.age,
          profileId: profile.id,
          userId: req.user.id,
          doctorId: doctor.id,
          hospitalId: doctor.hospitalId,
          status,
          approveBy: approveDeadline(data.date, data.time),
        },
        include,
      });
      await logEvent(tx, a.id, { action: "book", to: status, actorId: req.user.id });
      return a;
    });
    res.status(201).json({ appointment: appt });
  } catch (e) {
    // The partial unique index on (doctorId, date, time) for active bookings fires here
    if (slotTaken(e)) throw new HttpError(409, "Someone just booked this slot. Please pick another time");
    throw e;
  }
});

appointmentsRouter.get("/me", async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { userId: req.user.id },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    include,
  });
  res.json({ appointments });
});

appointmentsRouter.post("/:id/cancel", async (req, res) => {
  const updated = await prisma.$transaction((tx) =>
    transition(tx, String(req.params.id), "cancel", { actorId: req.user.id, role: "USER", note: "Cancelled by patient", scope: { userId: req.user.id } }),
  );
  res.json({ appointment: updated });
});

/**
 * Move a booking to another slot with the same doctor in one step.
 * The old slot is released only if the new one is free (single UPDATE, guarded by the unique index).
 * The request goes back for approval, and any token is cleared.
 */
appointmentsRouter.post("/:id/reschedule", async (req, res) => {
  const { date, time } = z.object(slotSchema).parse(req.body);
  const appt = await prisma.appointment.findUnique({ where: { id: String(req.params.id) }, include: { doctor: true } });
  if (!appt || appt.userId !== req.user.id) throw notFound("Appointment");
  if (!ACTIVE_STATUSES.includes(appt.status)) throw new HttpError(400, "Only upcoming bookings can be moved");
  if (slotStart(appt.date, appt.time).getTime() - Date.now() < 2 * 3600_000) {
    throw new HttpError(400, "Bookings can be moved up to 2 hours before the visit. Please call the hospital");
  }
  if (appt.date === date && appt.time === time) throw new HttpError(400, "That's already your booking time");
  await assertBookable(appt.doctor, date, time);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const status = appt.doctor.autoApprove ? "DOCTOR_APPROVED" : "PENDING";
      const u = await tx.appointment.update({
        where: { id: appt.id },
        data: { date, time, status, tokenNumber: null, note: null, approveBy: approveDeadline(date, time) },
        include,
      });
      await logEvent(tx, appt.id, { action: "reschedule", from: appt.status, to: status, note: `${appt.date} ${appt.time} → ${date} ${time}`, actorId: req.user.id });
      return u;
    });
    res.json({ appointment: updated });
  } catch (e) {
    if (slotTaken(e)) throw new HttpError(409, "That slot was just taken. Please pick another time");
    throw e;
  }
});
