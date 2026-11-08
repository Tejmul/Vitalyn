import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError, notFound } from "../lib/http.js";
import { ACTIVE_STATUSES, isPast, slotStart, slotsForDay } from "../lib/slots.js";
import { MESSAGES, approveDeadline, isSlotClash, logEvent, nextToken, smsVars, transition, withTokenRetry } from "../lib/transitions.js";
import { notify } from "../lib/notify.js";
import { requireAuth, requireRole } from "../middleware/auth.js";


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
  if (!doctor.active) throw new HttpError(400, `${doctor.name} is not taking bookings right now`);
  const leave = await prisma.doctorLeave.findUnique({ where: { doctorId_date: { doctorId: doctor.id, date } } });
  if (leave) throw new HttpError(400, "The doctor is on leave that day. Pick another day");
  if (!slotsForDay(doctor, date).includes(time)) throw new HttpError(400, "That time isn't one of the doctor's slots");
  if (isPast(date, time)) throw new HttpError(400, "That slot has already passed. Pick a later one");
}

const slotTaken = isSlotClash;

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
    // Auto-confirm doctors: confirmed with a token straight away. Otherwise it waits for one approver.
    const appt = await withTokenRetry(() =>
      prisma.$transaction(async (tx) => {
        const confirmed = doctor.autoConfirm;
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
            status: confirmed ? "CONFIRMED" : "PENDING",
            tokenNumber: confirmed ? await nextToken(tx, doctor.id, data.date) : null,
            approveBy: confirmed ? null : approveDeadline(data.date, data.time),
          },
          include,
        });
        await logEvent(tx, a.id, { action: "book", to: a.status, note: confirmed ? "Auto-confirmed" : null, actorId: req.user.id });
        if (confirmed) {
          await notify(tx, req.user.id, { ...MESSAGES.confirmed(a, doctor), appointmentId: a.id, sms: { kind: "CONFIRMED", vars: smsVars(a, doctor, a.hospital) } });
        }
        return a;
      }),
    );
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
    const updated = await withTokenRetry(() =>
      prisma.$transaction(async (tx) => {
        const confirmed = appt.doctor.autoConfirm;
        const u = await tx.appointment.update({
          where: { id: appt.id },
          data: {
            date,
            time,
            status: confirmed ? "CONFIRMED" : "PENDING",
            // Clear first so the old token doesn't count when numbering the new day
            tokenNumber: null,
            note: null,
            approveBy: confirmed ? null : approveDeadline(date, time),
          },
        });
        const token = confirmed ? await nextToken(tx, appt.doctorId, date) : null;
        const final = token ? await tx.appointment.update({ where: { id: u.id }, data: { tokenNumber: token }, include }) : await tx.appointment.findUnique({ where: { id: u.id }, include });
        await logEvent(tx, appt.id, { action: "reschedule", from: appt.status, to: final.status, note: `${appt.date} ${appt.time} → ${date} ${time}`, actorId: req.user.id });
        if (confirmed) {
          await notify(tx, req.user.id, { ...MESSAGES.confirmed(final, appt.doctor), appointmentId: appt.id, sms: { kind: "CONFIRMED", vars: smsVars(final, appt.doctor, final.hospital) } });
        }
        return final;
      }),
    );
    res.json({ appointment: updated });
  } catch (e) {
    if (slotTaken(e)) throw new HttpError(409, "That slot was just taken. Please pick another time");
    throw e;
  }
});
