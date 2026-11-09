import crypto from "node:crypto";
import { config } from "../config.js";
import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";
import { signToken } from "../middleware/auth.js";

export const REFRESH_COOKIE = "vitalyn_rt";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function readCookie(req, name) {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function cookieOptions() {
  const sameSite = ["lax", "strict", "none"].includes(config.cookieSameSite) ? config.cookieSameSite : "lax";
  return {
    httpOnly: true,
    secure: config.isProd || sameSite === "none",
    sameSite,
    path: "/api/auth",
    maxAge: config.refreshDays * 86_400_000,
  };
}

/** Issues an access token and sets a fresh refresh cookie. */
export async function startSession(req, res, user) {
  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + config.refreshDays * 86_400_000),
      userAgent: req.headers["user-agent"]?.slice(0, 200) ?? null,
    },
  });
  res.cookie(REFRESH_COOKIE, raw, cookieOptions());
  return signToken(user);
}

/**
 * Swaps the refresh cookie for a new one and a new access token.
 * If an already-used token is presented, someone may have copied it: every session for that user ends.
 */
export async function rotateSession(req, res) {
  const raw = readCookie(req, REFRESH_COOKIE);
  if (!raw) throw new HttpError(401, "Please log in to continue");
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
  if (!token) throw new HttpError(401, "Please log in to continue");
  if (token.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    throw new HttpError(401, "For your safety you've been logged out. Please log in again");
  }
  if (token.expiresAt < new Date()) throw new HttpError(401, "Your session has expired. Please log in again");
  if (token.user.disabledAt) {
    await prisma.refreshToken.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    throw new HttpError(401, "Your access has been removed. Ask your hospital manager");
  }
  await prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
  const accessToken = await startSession(req, res, token.user);
  return { accessToken, user: token.user };
}

export async function endSession(req, res) {
  const raw = readCookie(req, REFRESH_COOKIE);
  if (raw) await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

/** Ends every session for a user (e.g. after account deletion). */
export const endAllSessions = (userId) => prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
