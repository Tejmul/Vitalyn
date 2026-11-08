import { Router } from "express";
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

onboardingRouter.post("/applications", async (req, res) => {
  const data = applicationSchema.parse(req.body);
  assertNoBannedClaims({ "the description": data.description });

  const [user, pending] = await Promise.all([
    prisma.user.findFirst({ where: { OR: [{ email: data.contactEmail }, { phone: data.contactPhone }] } }),
    prisma.hospitalApplication.findFirst({ where: { contactEmail: data.contactEmail, status: "PENDING" } }),
  ]);
  if (user) throw new HttpError(409, "An account with this email or mobile number already exists. Use a different one for the hospital desk");
  if (pending) throw new HttpError(409, "There's already an application under review for this email");

  const { consent: _consent, ...rest } = data;
  const application = await prisma.hospitalApplication.create({
    data: { ...rest, consentAt: new Date() },
    select: { id: true, hospitalName: true, status: true, createdAt: true },
  });
  res.status(201).json({ application });
});
