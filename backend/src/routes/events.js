import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const eventsRouter = Router();

/** Upcoming events across all hospitals (or one, with ?hospitalId=). Hidden (unverified) hospitals are left out. */
eventsRouter.get("/", async (req, res) => {
  const q = z
    .object({ hospitalId: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(12) })
    .parse(req.query);
  const events = await prisma.event.findMany({
    where: { endsAt: { gte: new Date() }, hospital: { verified: true }, ...(q.hospitalId ? { hospitalId: q.hospitalId } : {}) },
    orderBy: { startsAt: "asc" },
    take: q.limit,
    include: { hospital: { select: { id: true, name: true, slug: true, city: true, tone: true } } },
  });
  res.json({ events });
});
