/**
 * Writes a patient update to the Notification outbox.
 * Today these show in-app. When WhatsApp/SMS is connected, a worker reads unsent
 * rows (sentAt = null, channel = WHATSAPP/SMS) and delivers them, so API requests never wait
 * on a third-party provider.
 */
export async function notify(db, userId, { title, body, appointmentId }) {
  if (!userId) return null; // walk-ins and deleted accounts have no inbox
  const n = await db.notification.create({ data: { userId, title, body, appointmentId } });
  if (process.env.NODE_ENV !== "production") console.log(`[notify] ${userId}: ${title}`);
  return n;
}
