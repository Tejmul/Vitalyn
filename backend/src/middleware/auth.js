import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../lib/http.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, hospitalId: user.hospitalId }, config.jwtSecret, {
    expiresIn: config.accessTtl,
  });
}

/** Requires a valid `Authorization: Bearer <token>` header. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return next(new HttpError(401, "Please log in to continue"));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, hospitalId: payload.hospitalId ?? null };
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
