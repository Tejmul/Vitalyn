/** Records an admin action. Never throws: a logging hiccup must not block the action itself. */
export async function audit(db, req, action, { target = null, meta = null } = {}) {
  try {
    await db.auditLog.create({ data: { actorId: req.user.id, action, target, meta, ip: req.ip ?? null } });
  } catch (e) {
    console.error("[audit] failed to record", action, e);
  }
}

/** 98******10: enough to recognise a number, not enough to misuse it. */
export const maskPhone = (p) => (p ? `${p.slice(0, 2)}******${p.slice(-2)}` : null);
