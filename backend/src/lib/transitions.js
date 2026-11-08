import { HttpError, forbidden } from "./http.js";
import { notify } from "./notify.js";
import { slotStart } from "./slots.js";

const ACTIVE = ["PENDING", "DOCTOR_APPROVED", "CONFIRMED"];

/**
 * Every allowed status change in one place.
 * roles: who may trigger it (SYSTEM = background job).
 */
export const TRANSITIONS = {
  approve: { from: ["PENDING"], to: "DOCTOR_APPROVED", roles: ["DOCTOR", "HOSPITAL"], past: "approved" },
  confirm: { from: ["DOCTOR_APPROVED"], to: "CONFIRMED", roles: ["HOSPITAL"], past: "confirmed" },
  reject: { from: ["PENDING", "DOCTOR_APPROVED"], to: "REJECTED", roles: ["DOCTOR", "HOSPITAL"], past: "rejected" },
  arrive: { from: ["CONFIRMED"], to: "COMPLETED", roles: ["DOCTOR", "HOSPITAL"], past: "marked arrived" },
  no_show: { from: ["CONFIRMED"], to: "NO_SHOW", roles: ["DOCTOR", "HOSPITAL"], past: "marked no-show" },
  cancel: { from: ACTIVE, to: "CANCELLED", roles: ["USER"], past: "cancelled" },
  leave: { from: ACTIVE, to: "CANCELLED", roles: ["DOCTOR", "HOSPITAL"], past: "cancelled" },
  expire: { from: ["PENDING", "DOCTOR_APPROVED"], to: "EXPIRED", roles: ["SYSTEM"], past: "expired" },
};

const when = (a) => {
  const d = new Date(`${a.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const [h, m] = a.time.split(":").map(Number);
  return `${d}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const MESSAGES = {
  approve: (a, d) => ({ title: "Doctor approved your request", body: `${d.name} accepted ${when(a)} for ${a.patientName}. The hospital desk will confirm and give you a token.` }),
  confirm: (a, d) => ({ title: `Confirmed: token ${tokenCode(a.tokenNumber, d.name)}`, body: `${when(a)} with ${d.name}. Show your token at the desk.` }),
  reject: (a, d) => ({ title: "Booking not accepted", body: `${d.name} couldn't take ${when(a)}${a.note ? ` (${a.note})` : ""}. Please pick another time.` }),
  expire: (a) => ({ title: "Request expired", body: `The hospital didn't reply in time for ${when(a)}. Your slot was released. Please book another time.` }),
  leave: (a, d) => ({ title: "Doctor on leave: booking cancelled", body: `${d.name} is not available on ${when(a).split(",").slice(0, 2).join(",")}. Please pick another day.` }),
};

export function tokenCode(n, doctorName = "A") {
  if (n === null || n === undefined) return "—";
  return `${(doctorName.replace(/^Dr\.?\s*/, "")[0] ?? "A").toUpperCase()}-${String(n).padStart(2, "0")}`;
}

/**
 * Deadline for a request to be approved and confirmed: the earlier of 2 hours from now
 * or 2 hours before the slot, but never less than 15 minutes from now.
 */
export function approveDeadline(date, time, now = new Date()) {
  const twoHours = 2 * 3600_000;
  const t = Math.min(now.getTime() + twoHours, slotStart(date, time).getTime() - twoHours);
  return new Date(Math.max(t, now.getTime() + 15 * 60_000));
}

/** Writes one audit row. Use for booking, rescheduling, payment and other non-status events too. */
export function logEvent(db, appointmentId, { action, from = null, to, note, actorId = null }) {
  return db.appointmentEvent.create({ data: { appointmentId, action, from, to, note, actorId } });
}

/**
 * Applies `action` to an appointment inside transaction `tx`.
 * Checks the move is allowed, assigns tokens on confirm, logs it and notifies the patient.
 */
export async function transition(tx, appointmentId, action, { actorId = null, role = "SYSTEM", note, scope } = {}) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new HttpError(400, `Unknown action ${action}`);
  if (!rule.roles.includes(role)) throw forbidden(`Only ${rule.roles.join(" or ").toLowerCase()} accounts can do that`);

  const appt = await tx.appointment.findUnique({ where: { id: appointmentId }, include: { doctor: true } });
  if (!appt) throw new HttpError(404, "Appointment not found");
  if (scope?.hospitalId && appt.hospitalId !== scope.hospitalId) throw new HttpError(404, "Appointment not found");
  if (scope?.doctorId && appt.doctorId !== scope.doctorId) throw new HttpError(404, "Appointment not found");
  if (scope?.userId && appt.userId !== scope.userId) throw new HttpError(404, "Appointment not found");
  if (!rule.from.includes(appt.status)) {
    throw new HttpError(409, `This booking is ${appt.status.toLowerCase().replace("_", " ")} and can't be ${rule.past} now`);
  }

  const data = { status: rule.to, ...(note ? { note } : {}) };
  if (action === "confirm") {
    const last = await tx.appointment.aggregate({
      where: { doctorId: appt.doctorId, date: appt.date, tokenNumber: { not: null } },
      _max: { tokenNumber: true },
    });
    data.tokenNumber = (last._max.tokenNumber ?? 0) + 1;
  }
  const updated = await tx.appointment.update({ where: { id: appt.id }, data });
  await logEvent(tx, appt.id, { action, from: appt.status, to: rule.to, note, actorId });

  const msg = MESSAGES[action]?.(updated, appt.doctor);
  if (msg) await notify(tx, appt.userId, { ...msg, appointmentId: appt.id });
  return updated;
}
