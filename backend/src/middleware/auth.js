import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../lib/http.js";

/**
 * Every token we sign says what it is for (`typ`) and is checked for that purpose.
 * Without this, a short-lived sign-up token (which proves a phone, not an account)
 * would pass as a login and reach routes that only need "someone signed in".
 */
const ALG = "HS256";
const ACCESS = "access";
const SIGNUP = "signup";

export function signToken(user) {
  return jwt.sign(
    { typ: ACCESS, sub: user.id, role: user.role, hospitalId: user.hospitalId, staffRole: user.staffRole ?? null },
    config.jwtSecret,
    { algorithm: ALG, expiresIn: config.accessTtl, audience: ACCESS },
  );
}

/** Proof that `phone` passed an OTP check but has no account yet. Only /complete-profile accepts it. */
export function signSignupToken(phone) {
  return jwt.sign({ typ: SIGNUP, phone }, config.jwtSecret, { algorithm: ALG, expiresIn: "15m", audience: SIGNUP });
}

/** Returns the verified phone, or throws. */
export function verifySignupToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: [ALG], audience: SIGNUP });
  if (payload.typ !== SIGNUP || typeof payload.phone !== "string") throw new Error("not a sign-up token");
  return payload.phone;
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: [ALG], audience: ACCESS });
  if (payload.typ !== ACCESS || typeof payload.sub !== "string" || !payload.sub || typeof payload.role !== "string") {
    throw new Error("not an access token");
  }
  return payload;
}

/** Requires a valid `Authorization: Bearer <token>` header. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return next(new HttpError(401, "Please log in to continue"));
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, hospitalId: payload.hospitalId ?? null, staffRole: payload.staffRole ?? null };
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Please log in again"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Please log in to continue"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "You don't have access to this"));
    next();
  };
}

/** Hospital managers only (not reception). */
export function requireManager(req, _res, next) {
  if (req.user?.role === "HOSPITAL" && req.user.staffRole === "MANAGER") return next();
  next(new HttpError(403, "Only the hospital's manager can do this"));
}
