import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError, forbidden } from "../lib/http.js";
import { publicUser } from "../lib/serialize.js";
import { requestOtp, verifyOtp } from "../lib/otp.js";
import { endAllSessions, endSession } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

/** The signed-in user's own data: notifications and DPDP rights (export, delete). */
export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/notifications", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  res.json({ notifications, unread: notifications.filter((n) => !n.readAt).length });
});

meRouter.post("/notifications/read", async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});

/** "Download my data": everything we hold about this user, as JSON. */
meRouter.get("/export", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      profiles: true,
      notifications: true,
      appointments: {
        include: {
          events: { select: { action: true, from: true, to: true, note: true, createdAt: true } },
          doctor: { select: { name: true, specialty: true } },
          hospital: { select: { name: true, city: true } },
        },
      },
    },
  });
  const { profiles, notifications, appointments, ...rest } = user;
  res.setHeader("Content-Disposition", `attachment; filename="vitalyn-data-${user.id}.json"`);
  res.json({ exportedAt: new Date().toISOString(), account: publicUser(rest), profiles, appointments, notifications });
});

/** Step 1 of deleting an account: send a confirmation code to the account's mobile. */
meRouter.post("/delete-code", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user?.phone) throw new HttpError(400, "This account has no mobile number");
  if (user.role !== "USER") throw forbidden("Staff accounts are removed by the platform admin");
  res.json(await requestOtp(user.phone, "DELETE_ACCOUNT"));
});

/**
 * Step 2, "Delete my account" with the code. Profiles and notifications are erased. Bookings are
 * kept for the hospital's records but anonymised and unlinked from the person.
 */
meRouter.delete("/", async (req, res) => {
  const { code } = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") }).parse(req.body ?? {});
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new HttpError(404, "Account not found");
  if (user.role !== "USER") throw forbidden("Staff accounts are removed by the platform admin");
  await verifyOtp(user.phone, "DELETE_ACCOUNT", code);
  await endAllSessions(user.id);

  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { userId: user.id, status: { in: ["PENDING", "DOCTOR_APPROVED", "CONFIRMED"] } },
      data: { status: "CANCELLED", note: "Account deleted" },
    }),
    prisma.appointment.updateMany({
      where: { userId: user.id },
      data: { patientName: "Deleted patient", patientAge: null, reason: null, userId: null, profileId: null },
    }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
  await endSession(req, res);
  res.status(204).end();
});
