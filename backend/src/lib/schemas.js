import { z } from "zod";

/** Indian mobile number: 10 digits starting 6–9, accepted with or without +91 / spaces / dashes. */
export const indianMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"));

export const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, "PIN code has 6 digits");

export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

/** ABDM Health Facility Registry ID, e.g. IN2410000187. Empty string becomes null. */
export const hfrId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^IN\d{10}$/, "HFR ID looks like IN0610000123")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));
