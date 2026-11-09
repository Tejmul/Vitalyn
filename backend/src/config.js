import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Which proxies to trust for the client IP (rate limits and audit log use it).
 * Must match the real hosting: a number of proxy hops, "false" when the API is reached
 * directly, or a list of trusted addresses/subnets. A wrong value lets clients pick their
 * own IP through X-Forwarded-For, or puts every user behind one shared limit.
 */
function trustProxy(raw) {
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "0") return false;
  if (v === "true") throw new Error("TRUST_PROXY=true trusts any X-Forwarded-For; set a hop count or subnet list");
  if (/^\d+$/.test(v)) return Number(v);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
  trustProxy: trustProxy(process.env.TRUST_PROXY || "1"),
  jwtSecret: required("JWT_SECRET"),
  // Short-lived access token; the httpOnly refresh cookie renews it.
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 30),
  // "lax" when the site and API share a domain (or localhost); "none" when they're on different sites.
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase(),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  msg91: {
    // Override only to point at a mock server in tests
    baseUrl: (process.env.MSG91_BASE_URL ?? "https://control.msg91.com").replace(/\/$/, ""),
    authKey: process.env.MSG91_AUTH_KEY ?? "",
    senderId: process.env.MSG91_SENDER_ID ?? "",
    otpFlowId: process.env.MSG91_OTP_FLOW_ID ?? "",
    // Name of the variable in your MSG91 OTP template, e.g. ##otp## → "otp"
    otpVar: process.env.MSG91_OTP_VAR ?? "otp",
    // MSG91's Flow API documents "flow_id"; newer accounts may use "template_id"
    flowField: process.env.MSG91_FLOW_FIELD ?? "flow_id",
    // One DLT-approved template per message type. Empty = that message type isn't sent (logged as skipped).
    flows: {
      CONFIRMED: process.env.MSG91_FLOW_CONFIRMED ?? "",
      REMINDER: process.env.MSG91_FLOW_REMINDER ?? "",
      REJECTED: process.env.MSG91_FLOW_REJECTED ?? "",
      EXPIRED: process.env.MSG91_FLOW_EXPIRED ?? "",
      DOCTOR_LEAVE: process.env.MSG91_FLOW_DOCTOR_LEAVE ?? "",
      TOKEN_NEAR: process.env.MSG91_FLOW_TOKEN_NEAR ?? "",
    },
  },
};
