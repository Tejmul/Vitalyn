import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { assertNoBannedClaims } from "../lib/claims.js";
import { hfrId, indianMobile, pincode } from "../lib/schemas.js";

/** Public: a hospital applies to join. Nothing goes live until the platform admin approves it. */
export const onboardingRouter = Router();

const applicationSchema = z.object({
  hospitalName: z.string().trim().min(3, "Enter the hospital's name").max(100),
  description: z.string().trim().min(20, "Tell patients a little about the hospital (20+ characters)").max(600),
  address: z.string().trim().min(5, "Enter the street address").max(160),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.string().trim().min(2, "Pick the state").max(60),
  pincode,
  phone: z.string().trim().min(8, "Enter the hospital's phone number").max(20),
  lat: z.coerce.number().min(6, "Location must be in India").max(37.5, "Location must be in India"),
  lng: z.coerce.number().min(68, "Location must be in India").max(97.5, "Location must be in India"),
  specialties: z.array(z.string().trim().min(2).max(40)).min(1, "Pick at least one speciality").max(20),
  beds: z.coerce.number().int().min(1).max(5000).optional(),
  emergency24x7: z.boolean().default(false),
  registrationNo: z.string().trim().min(4, "Enter the state registration number").max(60),
  hfrId,
  contactName: z.string().trim().min(2, "Enter your name").max(80),
  contactEmail: z.email("Enter a valid email").trim().toLowerCase(),
  contactPhone: indianMobile,
  consent: z.literal(true, { error: "Please agree to the terms to apply" }),
});

/** A hospital applies once; a handful per network per hour is plenty and keeps junk out of the admin's queue. */
const applyLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "Too many applications from this network. Please try again in an hour" }),
});

onboardingRouter.post("/applications", applyLimiter, async (req, res) => {
  const data = applicationSchema.parse(req.body);
  assertNoBannedClaims({ "the hospital name": data.hospitalName, "the description": data.description });

  // Whether the contact's email or number already has a Vitalyn account is not revealed here:
  // the admin sees that clash when approving and asks the applicant for another contact.
  const pending = await prisma.hospitalApplication.findFirst({
    where: { status: "PENDING", OR: [{ contactEmail: data.contactEmail }, { contactPhone: data.contactPhone }] },
  });
  if (pending) throw new HttpError(409, "There's already an application under review for this contact");

  const { consent: _consent, ...rest } = data;
  const application = await prisma.hospitalApplication.create({
    data: { ...rest, consentAt: new Date() },
    select: { id: true, hospitalName: true, status: true, createdAt: true },
  });
  res.status(201).json({ application });
});
