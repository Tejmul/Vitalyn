import crypto from "node:crypto";
import { config } from "../config.js";
import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";
import { otpSmsLive, smsSender } from "./sms.js";

export const OTP = {
  length: 6,
  ttlMinutes: 10,
  resendAfterSeconds: 30,
  maxPerWindow: 3,
  windowMinutes: 10,
  maxAttempts: 5,
};

// Codes are hashed with their own key, derived from JWT_SECRET, so the OTP store and the token signer never share a key.
const otpKey = Buffer.from(crypto.hkdfSync("sha256", config.jwtSecret, "", "vitalyn/otp-hmac/v1", 32));
const hash = (phone, purpose, code) => crypto.createHmac("sha256", otpKey).update(`${phone}:${purpose}:${code}`).digest("hex");

/**
 * Sends a fresh code. Limits: one every 30 s, three per 10 minutes per number.
 * There is no long lockout: once the 10-minute window passes, the number can ask again.
 * In development without MSG91 keys, the code comes back as `devCode` so the app can show it.
 */
export async function requestOtp(phone, purpose = "LOGIN") {
  if (config.isProd && !otpSmsLive()) throw new HttpError(503, "Text messages aren't set up yet. Please try again later");

  const code = String(crypto.randomInt(0, 10 ** OTP.length)).padStart(OTP.length, "0");

  // The limit check and the new code are one step per number: a per-number lock makes
  // parallel requests queue up, so they can't all see "no recent code" and each send an SMS.
  const challenge = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${purpose}:${phone}`}))`;
    const since = new Date(Date.now() - OTP.windowMinutes * 60_000);
    const recent = await tx.otpChallenge.findMany({
      where: { phone, purpose, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent[0]) {
      const wait = OTP.resendAfterSeconds - Math.floor((Date.now() - recent[0].createdAt.getTime()) / 1000);
      if (wait > 0) throw new HttpError(429, `Please wait ${wait} seconds before asking for another code`, { retryAfter: wait });
    }
    if (recent.length >= OTP.maxPerWindow) {
      const oldest = recent[recent.length - 1].createdAt.getTime();
      const minutes = Math.max(1, Math.ceil((oldest + OTP.windowMinutes * 60_000 - Date.now()) / 60_000));
      throw new HttpError(429, `Too many codes for this number. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}`, { retryAfter: minutes * 60 });
    }
    // Older unused codes for this number stop working once a new one is sent.
    await tx.otpChallenge.updateMany({ where: { phone, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
    return tx.otpChallenge.create({
      data: { phone, purpose, codeHash: hash(phone, purpose, code), expiresAt: new Date(Date.now() + OTP.ttlMinutes * 60_000) },
    });
  });

  try {
    await smsSender().send({ flowId: config.msg91.otpFlowId, mobile: phone, vars: { [config.msg91.otpVar]: code } });
  } catch (e) {
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    console.error("[otp] send failed", e);
    throw new HttpError(502, "We couldn't send the code. Check the number and try again");
  }

  return {
    resendIn: OTP.resendAfterSeconds,
    expiresInMinutes: OTP.ttlMinutes,
    ...(!config.isProd && !otpSmsLive() ? { devCode: code } : {}),
  };
}

/**
 * Checks a code; consumes it on success. Five tries per code, then it stops working.
 * Each try first claims one attempt with a conditional update, so parallel guesses
 * can't all slip past the limit before the counter moves.
 */
export async function verifyOtp(phone, purpose, code) {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge || challenge.expiresAt < new Date()) throw new HttpError(400, "That code has expired. Ask for a new one");

  const claimed = await prisma.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, attempts: { lt: OTP.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) throw new HttpError(429, "Too many wrong tries. Ask for a new code");

  const expected = Buffer.from(challenge.codeHash, "hex");
  const given = Buffer.from(hash(phone, purpose, String(code).trim()), "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    const { attempts } = await prisma.otpChallenge.findUniqueOrThrow({ where: { id: challenge.id }, select: { attempts: true } });
    const left = OTP.maxAttempts - attempts;
    throw new HttpError(400, left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left` : "Too many wrong tries. Ask for a new code");
  }
  // Single use: only one request can flip consumedAt.
  const used = await prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (used.count === 0) throw new HttpError(400, "That code has already been used. Ask for a new one");
  return true;
}
