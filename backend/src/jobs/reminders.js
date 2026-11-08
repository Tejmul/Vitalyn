import { prisma } from "../lib/prisma.js";
import { notify, queueSms } from "../lib/notify.js";
import { addDays, slotStart, todayIST } from "../lib/slots.js";
import { smsVars, when } from "../lib/transitions.js";

const LEAD_MS = 2 * 3600_000; // remind 2 hours before the visit

/** Queues one reminder per confirmed visit that starts within the next 2 hours. */
export async function runRemindersOnce() {
  const today = todayIST();
  const candidates = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", reminderSentAt: null, date: { in: [today, addDays(today, 1)] } },
    include: { doctor: true, hospital: { select: { name: true } } },
  });
  const now = Date.now();
  let queued = 0;
  for (const a of candidates) {
    const start = slotStart(a.date, a.time).getTime();
    if (start <= now || start - now > LEAD_MS) continue;
    // Claim first so a second instance can't send the same reminder
    const claimed = await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (claimed.count === 0) continue;
    const vars = smsVars(a, a.doctor, a.hospital);
    if (a.userId) {
      await notify(prisma, a.userId, {
        title: `Reminder: ${when(a)}`,
        body: `${a.doctor.name} at ${a.hospital.name}. Your token is ${vars.token}.`,
        appointmentId: a.id,
        sms: { kind: "REMINDER", vars },
      });
    } else if (a.walkInPhone) {
      await queueSms(prisma, { phone: a.walkInPhone, kind: "REMINDER", vars, appointmentId: a.id });
    }
    queued++;
  }
  return queued;
}

export function startReminders(intervalMs = 60_000) {
  const tick = async () => {
    try {
      const n = await runRemindersOnce();
      if (n) console.log(`[reminders] queued ${n}`);
    } catch (e) {
      console.error("[reminders] failed", e);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}
