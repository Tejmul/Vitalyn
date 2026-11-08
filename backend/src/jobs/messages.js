import { prisma } from "../lib/prisma.js";
import { smsSender, templateFor } from "../lib/sms.js";

/** Wait before retry n (after the 1st, 2nd, 3rd failure). After the 4th failure the message is marked failed. */
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

async function deliver(msg) {
  const template = templateFor(msg.kind);
  if (template.skip) {
    await prisma.outboundMessage.update({ where: { id: msg.id }, data: { status: "SKIPPED", lastError: template.skip } });
    return "skipped";
  }
  const sender = smsSender();
  try {
    const { providerId } = await sender.send({ flowId: template.flowId, mobile: msg.phone, vars: msg.vars });
    await prisma.outboundMessage.update({
      where: { id: msg.id },
      data: { status: "SENT", provider: sender.name, providerId, sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
    return "sent";
  } catch (e) {
    const attempts = msg.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    await prisma.outboundMessage.update({
      where: { id: msg.id },
      data: {
        status: failed ? "FAILED" : "QUEUED",
        attempts,
        provider: sender.name,
        lastError: String(e.message ?? e).slice(0, 300),
        nextAttemptAt: failed ? undefined : new Date(Date.now() + BACKOFF_MS[attempts - 1]),
      },
    });
    return failed ? "failed" : "retry";
  }
}

/**
 * Sends queued text messages every few seconds. Each message is claimed (QUEUED → SENDING)
 * before sending, so two API instances never send the same message twice.
 */
export async function runMessageQueueOnce(batch = 20) {
  const due = await prisma.outboundMessage.findMany({
    where: { status: "QUEUED", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: batch,
  });
  const results = {};
  for (const msg of due) {
    // nextAttemptAt doubles as the claim time while SENDING
    const claimed = await prisma.outboundMessage.updateMany({ where: { id: msg.id, status: "QUEUED" }, data: { status: "SENDING", nextAttemptAt: new Date() } });
    if (claimed.count === 0) continue;
    const r = await deliver(msg);
    results[r] = (results[r] ?? 0) + 1;
  }
  return results;
}

export function startMessageQueue(intervalMs = 15_000) {
  // Messages stuck in SENDING (process died mid-send) go back to the queue after 10 minutes.
  const requeueStuck = () =>
    prisma.outboundMessage.updateMany({ where: { status: "SENDING", nextAttemptAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { status: "QUEUED" } });
  const tick = async () => {
    try {
      await requeueStuck();
      const r = await runMessageQueueOnce();
      if (Object.keys(r).length) console.log("[sms]", r);
    } catch (e) {
      console.error("[sms] queue failed", e);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}
