import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { publicUser } from "../lib/serialize.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,24}$/, "3–24 letters, numbers, _ or ."),
  // Indian mobile: optional for now, 10 digits starting 6–9 (with or without +91)
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  // DPDP Act: the user must agree to the privacy notice before we store their data
  consent: z.literal(true, { error: "Please agree to the privacy notice to continue" }),
});

/** Bump when the privacy notice text changes, so we know what each user agreed to. */
export const CONSENT_VERSION = "2026-11-v1";

authRouter.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  const clash = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { username: data.username },
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });
  if (clash) {
    const field =
      clash.email === data.email ? "email" : clash.username === data.username ? "username" : "phone number";
    throw new HttpError(409, `An account with this ${field} already exists`);
  }
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 12),
      consentAt: new Date(),
      consentVersion: CONSENT_VERSION,
      // Everyone starts with a "Self" profile; family members are added later
      profiles: { create: { name: data.name, relation: "Self" } },
    },
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

const loginSchema = z.object({
  // Email today; username and phone also work so the UI can add them later.
  identifier: z.string().trim().min(3, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
});

authRouter.post("/login", async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const id = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { username: id }, { phone: id.replace(/^\+91/, "") }] },
  });
  // Same message either way so we don't reveal which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect");
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { hospital: { select: { id: true, name: true, slug: true } } },
  });
  if (!user) throw new HttpError(401, "Account not found");
  res.json({ user: { ...publicUser(user), hospital: user.hospital } });
});
