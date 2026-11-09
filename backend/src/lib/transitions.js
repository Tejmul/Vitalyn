import prismaPkg from "@prisma/client";
import { HttpError, forbidden } from "./http.js";
import { notify } from "./notify.js";
import { slotStart, todayIST } from "./slots.js";

const { Prisma } = prismaPkg;

// DOCTOR_APPROVED is legacy (old two-step flow); listed so any old row can still be cancelled.
const ACTIVE = ["PENDING", "DOCTOR_APPROVED", "CONFIRMED"];

/**
 * Every allowed status change in one place. One approver per doctor:
 * the desk OR the doctor accepts a request, and the token is issued at that moment.
 * roles: who may trigger it (SYSTEM = background job).
 */
export const TRANSITIONS = {
  accept: { from: ["PENDING", "DOCTOR_APPROVED"], to: "CONFIRMED", roles: ["DOCTOR", "HOSPITAL"], past: "accepted" },
  reject: { from: ["PENDING", "DOCTOR_APPROVED"], to: "REJECTED", roles: ["DOCTOR", "HOSPITAL"], past: "rejected" },
  arrive: { from: ["CONFIRMED"], to: "COMPLETED", roles: ["DOCTOR", "HOSPITAL"], past: "marked arrived" },
  no_show: { from: ["CONFIRMED"], to: "NO_SHOW", roles: ["DOCTOR", "HOSPITAL"], past: "marked no-show" },
  cancel: { from: ACTIVE, to: "CANCELLED", roles: ["USER"], past: "cancelled" },
  leave: { from: ACTIVE, to: "CANCELLED", roles: ["DOCTOR", "HOSPITAL"], past: "cancelled" },
  expire: { from: ["PENDING", "DOCTOR_APPROVED"], to: "EXPIRED", roles: ["SYSTEM"], past: "expired" },
};

export function tokenCode(n, doctorName = "A") {
  if (n === null || n === undefined) return "—";
  return `${(doctorName.replace(/^Dr\.?\s*/, "")[0] ?? "A").toUpperCase()}-${String(n).padStart(2, "0")}`;
}

export const when = (a) => {
  const d = new Date(`${a.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const [h, m] = a.time.split(":").map(Number);
  return `${d}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export const MESSAGES = {
  confirmed: (a, d) => ({ title: `Confirmed: token ${tokenCode(a.tokenNumber, d.name)}`, body: `${when(a)} with ${d.name} for ${a.patientName}. Show your token at the desk.` }),
  reject: (a, d) => ({ title: "Booking not accepted", body: `${d.name} couldn't take ${when(a)}${a.note ? ` (${a.note})` : ""}. Please pick another time.` }),
  expire: (a) => ({ title: "Request expired", body: `The hospital didn't reply in time for ${when(a)}. Your slot was released. Please book another time.` }),
  leave: (a, d) => ({ title: "Doctor on leave: booking cancelled", body: `${d.name} is not available on ${when(a).split(",").slice(0, 2).join(",")}. Please pick another day.` }),
};

/** Values for the SMS templates. Keys must match the variables in your MSG91 DLT templates. */
export function smsVars(a, doctor, hospital) {
  return {
    name: a.patientName.split(" ")[0],
    token: tokenCode(a.tokenNumber, doctor.name),
    doctor: doctor.name,
    when: when(a),
    hospital: hospital?.name ?? "",
  };
}

const SMS_KIND = { accept: "CONFIRMED", reject: "REJECTED", expire: "EXPIRED", leave: "DOCTOR_LEAVE" };

/**
 * Deadline for a manual-approval request: the earlier of 2 hours from now or 2 hours before
 * the slot, but never less than 15 minutes from now.
 */
export function approveDeadline(date, time, now = new Date()) {
  const twoHours = 2 * 3600_000;
  const t = Math.min(now.getTime() + twoHours, slotStart(date, time).getTime() - twoHours);
  return new Date(Math.max(t, now.getTime() + 15 * 60_000));
}

/**
 * Next token number in a doctor's queue for a day (tokens are unique per doctor per day).
 * A transaction-scoped advisory lock on (doctor, day) makes concurrent confirmations take turns,
 * so two bookings can't both read "last token = 4" and both write 5. Released at commit.
 */
export async function nextToken(tx, doctorId, date) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`token:${doctorId}:${date}`}))`;
  const last = await tx.appointment.aggregate({ where: { doctorId, date, tokenNumber: { not: null } }, _max: { tokenNumber: true } });
  return (last._max.tokenNumber ?? 0) + 1;
}

const uniqueOn = (e, column) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes(column);

/** A unique violation on the per-doctor-per-day token index (a race for the same number). */
export const isTokenClash = (e) => uniqueOn(e, "tokenNumber");

/** A unique violation on the one-active-booking-per-slot index (someone took the slot). */
export const isSlotClash = (e) => uniqueOn(e, "time");

/** Runs `fn` again (up to 3 times) if two requests raced for the same token number. */
export async function withTokenRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isTokenClash(e) || attempt >= 3) throw e;
    }
  }
}

/** Writes one audit row. Used for booking, rescheduling, payment and other non-status events too. */
export function logEvent(db, appointmentId, { action, from = null, to, note, actorId = null }) {
  return db.appointmentEvent.create({ data: { appointmentId, action, from, to, note, actorId } });
}

/**
 * Applies `action` to an appointment inside transaction `tx`.
 * Checks the move is allowed, issues the token on accept, logs it and notifies the patient.
 */
export async function transition(tx, appointmentId, action, { actorId = null, role = "SYSTEM", note, scope } = {}) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new HttpError(400, `Unknown action ${action}`);
  if (!rule.roles.includes(role)) throw forbidden(`Only ${rule.roles.join(" or ").toLowerCase()} accounts can do that`);

  const appt = await tx.appointment.findUnique({ where: { id: appointmentId }, include: { doctor: true, hospital: { select: { name: true } } } });
  if (!appt) throw new HttpError(404, "Appointment not found");
  if (scope?.hospitalId && appt.hospitalId !== scope.hospitalId) throw new HttpError(404, "Appointment not found");
  if (scope?.doctorId && appt.doctorId !== scope.doctorId) throw new HttpError(404, "Appointment not found");
  if (scope?.userId && appt.userId !== scope.userId) throw new HttpError(404, "Appointment not found");
  if (!rule.from.includes(appt.status)) {
    const now = appt.status === "DOCTOR_APPROVED" ? "waiting" : appt.status.toLowerCase().replace("_", " ");
    throw new HttpError(409, `This booking is ${now} and can't be ${rule.past} now`);
  }

  if ((action === "arrive" || action === "no_show") && appt.date > todayIST()) {
    throw new HttpError(409, "You can mark arrival or no-show only on the day of the visit");
  }

  const data = { status: rule.to, ...(note ? { note } : {}) };
  if (action === "accept") {
    data.tokenNumber = await nextToken(tx, appt.doctorId, appt.date);
    data.approveBy = null;
  }
  const updated = await tx.appointment.update({ where: { id: appt.id }, data });
  await logEvent(tx, appt.id, { action, from: appt.status, to: rule.to, note, actorId });

  const msg = (action === "accept" ? MESSAGES.confirmed : MESSAGES[action])?.(updated, appt.doctor);
  if (msg) {
    const sms = SMS_KIND[action] ? { kind: SMS_KIND[action], vars: smsVars(updated, appt.doctor, appt.hospital) } : undefined;
    await notify(tx, appt.userId, { ...msg, appointmentId: appt.id, sms });
  }
  return updated;
}
