/**
 * Patient updates. Every update shows in the app (Notification). When `sms` is given and the
 * person has a mobile number, a text message is also queued (OutboundMessage); the delivery
 * worker in jobs/messages.js sends it, so requests never wait on MSG91.
 */

const clip = (v) => String(v ?? "").slice(0, 30); // DLT template variables are short

/** Queue a text message to any number (also used for walk-ins, who have no account). */
export function queueSms(db, { phone, kind, vars, userId = null, appointmentId = null }) {
  if (!phone) return null;
  const safe = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, clip(v)]));
  return db.outboundMessage.create({ data: { phone, kind, vars: safe, userId, appointmentId } });
}

export async function notify(db, userId, { title, body, appointmentId, sms }) {
  if (!userId) return null; // walk-ins and deleted accounts have no inbox
  const n = await db.notification.create({ data: { userId, title, body, appointmentId } });
  if (sms) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
    await queueSms(db, { phone: user?.phone, kind: sms.kind, vars: sms.vars, userId, appointmentId });
  }
  if (process.env.NODE_ENV !== "production") console.log(`[notify] ${userId}: ${title}`);
  return n;
}
