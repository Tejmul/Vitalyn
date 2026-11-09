import { todayIST } from "./slots.js";
import { tokenCode, when } from "./transitions.js";
import { notify, queueSms } from "./notify.js";

/** How many people ahead counts as "your turn is near". */
export const NEAR_AHEAD = 2;

/**
 * Today's queue for one doctor: everyone with a token, in token order.
 * serving = the most recently called token; waiting = confirmed and not yet called.
 */
export async function doctorQueue(db, doctorId, date = todayIST()) {
  const rows = await db.appointment.findMany({
    where: { doctorId, date, tokenNumber: { not: null }, status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
    orderBy: { tokenNumber: "asc" },
    select: { id: true, tokenNumber: true, status: true, calledAt: true, patientName: true, userId: true, walkInPhone: true, tokenNearAt: true, date: true, time: true },
  });
  const called = rows.filter((r) => r.calledAt).sort((a, b) => b.calledAt.getTime() - a.calledAt.getTime());
  return { serving: called[0] ?? null, waiting: rows.filter((r) => r.status === "CONFIRMED" && !r.calledAt) };
}

/**
 * "Call next": the lowest waiting token is called. Runs under the same per-doctor-per-day
 * advisory lock as token numbering, so two desk screens can't call the same person.
 * Then everyone now NEAR_AHEAD or fewer from the front gets a one-time "your turn is near" alert.
 */
export async function callNext(tx, doctor, hospitalName) {
  const date = todayIST();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`token:${doctor.id}:${date}`}))`;
  const { waiting } = await doctorQueue(tx, doctor.id, date);
  const next = waiting[0];
  if (!next) return { called: null, waiting: 0 };

  await tx.appointment.update({ where: { id: next.id }, data: { calledAt: new Date() } });
  await tx.appointmentEvent.create({ data: { appointmentId: next.id, action: "call", from: "CONFIRMED", to: "CONFIRMED" } });

  const serving = tokenCode(next.tokenNumber, doctor.name);
  const rest = waiting.slice(1);
  for (const [ahead, a] of rest.entries()) {
    // rest[0] is next (0 ahead), rest[1] has 1 ahead, … rest[NEAR_AHEAD] has NEAR_AHEAD ahead
    if (ahead > NEAR_AHEAD) break;
    if (a.tokenNearAt) continue;
    await tx.appointment.update({ where: { id: a.id }, data: { tokenNearAt: new Date() } });
    const mine = tokenCode(a.tokenNumber, doctor.name);
    const vars = { name: a.patientName.split(" ")[0], token: mine, serving, doctor: doctor.name, when: when(a), hospital: hospitalName };
    const title = ahead === 0 ? `You're next: token ${mine}` : `Your turn is near: ${ahead} ahead of you`;
    const body = `Now serving ${serving} with ${doctor.name}. Your token is ${mine}. Please be near the OPD.`;
    if (a.userId) await notify(tx, a.userId, { title, body, appointmentId: a.id, sms: { kind: "TOKEN_NEAR", vars } });
    else if (a.walkInPhone) await queueSms(tx, { phone: a.walkInPhone, kind: "TOKEN_NEAR", vars, appointmentId: a.id });
  }
  return { called: { id: next.id, token: serving }, waiting: rest.length };
}
