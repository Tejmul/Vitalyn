import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError, notFound } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

/** Family members a patient books for. Each gets their own name, age and token. */
export const profilesRouter = Router();
profilesRouter.use(requireAuth, requireRole("USER"));

export const MAX_PROFILES = 6;
export const RELATIONS = ["Self", "Mother", "Father", "Spouse", "Son", "Daughter", "Grandparent", "Other"];

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the name").max(80),
  age: z.coerce.number().int().min(0).max(120).optional().nullable(),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]).optional().nullable(),
  relation: z.enum(RELATIONS).default("Other"),
  // ABHA number: 14 digits, often written 12-3456-7890-1234
  abhaNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{14}$/, "ABHA number has 14 digits"))
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

profilesRouter.get("/", async (req, res) => {
  const profiles = await prisma.patientProfile.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "asc" } });
  res.json({ profiles, max: MAX_PROFILES, relations: RELATIONS });
});

profilesRouter.post("/", async (req, res) => {
  const data = profileSchema.parse(req.body);
  const count = await prisma.patientProfile.count({ where: { userId: req.user.id } });
  if (count >= MAX_PROFILES) throw new HttpError(400, `You can add up to ${MAX_PROFILES} people to one account`);
  const profile = await prisma.patientProfile.create({ data: { ...data, userId: req.user.id } });
  res.status(201).json({ profile });
});

async function own(req) {
  const p = await prisma.patientProfile.findUnique({ where: { id: String(req.params.id) } });
  if (!p || p.userId !== req.user.id) throw notFound("Family member");
  return p;
}

profilesRouter.patch("/:id", async (req, res) => {
  const p = await own(req);
  const data = profileSchema.partial().parse(req.body);
  res.json({ profile: await prisma.patientProfile.update({ where: { id: p.id }, data }) });
});

profilesRouter.delete("/:id", async (req, res) => {
  const p = await own(req);
  if (p.relation === "Self") throw new HttpError(400, "Your own profile can't be removed");
  // Past bookings keep the patient's name; they just lose the link.
  await prisma.patientProfile.delete({ where: { id: p.id } });
  res.status(204).end();
});
