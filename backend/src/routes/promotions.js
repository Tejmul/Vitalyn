import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { bumpPromo } from "../lib/promoStats.js";

/** Public: record that someone opened a hospital from its sponsored card. */
export const promotionsRouter = Router();

const clickLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

promotionsRouter.post("/:id/click", clickLimiter, async (req, res) => {
  const p = await prisma.promotion.findUnique({ where: { id: String(req.params.id) }, select: { id: true, active: true, archivedAt: true } });
  // Unknown or ended promotions are ignored quietly: a click is never an error for the patient.
  if (p && p.active && !p.archivedAt) await bumpPromo(prisma, p.id, "clicks");
  res.status(204).end();
});
