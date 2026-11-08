import { Router } from "express";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { requestOtp, verifyOtp } from "../lib/otp.js";
import { indianMobile } from "../lib/schemas.js";
import { publicUser } from "../lib/serialize.js";
import { endSession, rotateSession, startSession } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

/**
 * Phone OTP is the only way in, for every role:
 *   1. POST /otp/request  { phone }          → code sent by SMS
 *   2. POST /otp/verify   { phone, code }    → session, or { needsProfile, signupToken } for a new number
 *   3. POST /complete-profile { signupToken, name, email?, consent, adult } → account + session
 */
export const authRouter = Router();

/** Per-IP guard on top of the per-number limits in lib/otp.js. */
const otpLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "Too many attempts from this network. Please wait a few minutes" }),
});

/** Bump when the privacy notice text changes, so we know what each user agreed to. */
export const CONSENT_VERSION = "2026-11-v1";

authRouter.post("/otp/request", otpLimiter, async (req, res) => {
  const { phone } = z.object({ phone: indianMobile }).parse(req.body);
  res.json(await requestOtp(phone, "LOGIN"));
});

authRouter.post("/otp/verify", otpLimiter, async (req, res) => {
  const { phone, code } = z
    .object({ phone: indianMobile, code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") })
    .parse(req.body);
  await verifyOtp(phone, "LOGIN", code);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (user) {
    const accessToken = await startSession(req, res, user);
    return res.json({ accessToken, user: publicUser(user) });
  }
  // New number: prove it was verified for the next step, without creating an account yet.
  const signupToken = jwt.sign({ phone, typ: "signup" }, config.jwtSecret, { expiresIn: "15m" });
  res.json({ needsProfile: true, signupToken });
});

authRouter.post("/complete-profile", async (req, res) => {
  const data = z
    .object({
      signupToken: z.string().min(10),
      name: z.string().trim().min(2, "Enter your full name").max(80),
      email: z.email("Enter a valid email").trim().toLowerCase().optional().or(z.literal("").transform(() => undefined)),
      // DPDP Act: notice + consent before we store anything
      consent: z.literal(true, { error: "Please agree to the privacy notice to continue" }),
      // Children are booked for by a parent from the parent's account
      adult: z.literal(true, { error: "You must be 18 or older to create an account. A parent can book for you" }),
    })
    .parse(req.body);

  let phone;
  try {
    const payload = jwt.verify(data.signupToken, config.jwtSecret);
    if (payload.typ !== "signup") throw new Error("wrong token");
    phone = payload.phone;
  } catch {
    throw new HttpError(401, "This sign-up link has expired. Please verify your number again");
  }

  if (await prisma.user.findUnique({ where: { phone } })) throw new HttpError(409, "This number already has an account. Please log in");
  if (data.email && (await prisma.user.findUnique({ where: { email: data.email } }))) throw new HttpError(409, "That email is already used by another account");

  const user = await prisma.user.create({
    data: {
      phone,
      name: data.name,
      email: data.email,
      consentAt: new Date(),
      consentVersion: CONSENT_VERSION,
      profiles: { create: { name: data.name, relation: "Self" } },
      // DPDP consent log
      consents: { create: { action: "GRANTED", version: CONSENT_VERSION, ageConfirmed: true } },
    },
  });
  const accessToken = await startSession(req, res, user);
  res.status(201).json({ accessToken, user: publicUser(user) });
});

authRouter.post("/refresh", async (req, res) => {
  const { accessToken, user } = await rotateSession(req, res);
  res.json({ accessToken, user: publicUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { hospital: { select: { id: true, name: true, slug: true } } },
  });
  if (!user) throw new HttpError(401, "Account not found");
  res.json({ user: { ...publicUser(user), hospital: user.hospital } });
});
