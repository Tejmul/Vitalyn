import { prisma } from "../lib/prisma.js";
import { transition } from "../lib/transitions.js";

/**
 * Every minute: manual-approval requests nobody accepted by their deadline expire,
 * their slot is released and the patient is told. (For multiple API instances, move this
 * to a single worker or BullMQ.)
 */
export function startExpiryJob(intervalMs = 60_000) {
  const run = async () => {
    try {
      const due = await prisma.appointment.findMany({
        where: { status: { in: ["PENDING", "DOCTOR_APPROVED"] }, approveBy: { lt: new Date() } },
        select: { id: true },
        take: 200,
      });
      for (const { id } of due) {
        await prisma.$transaction((tx) => transition(tx, id, "expire", { note: "No reply from the hospital in time" })).catch(() => {});
      }
      if (due.length) console.log(`[expire] ${due.length} request(s) expired`);
    } catch (e) {
      console.error("[expire] failed", e);
    }
  };
  run();
  return setInterval(run, intervalMs);
}
