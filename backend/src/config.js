import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
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
    authKey: process.env.MSG91_AUTH_KEY ?? "",
    senderId: process.env.MSG91_SENDER_ID ?? "",
    otpFlowId: process.env.MSG91_OTP_FLOW_ID ?? "",
    // Name of the variable in your MSG91 OTP template, e.g. ##otp## → "otp"
    otpVar: process.env.MSG91_OTP_VAR ?? "otp",
    // MSG91's Flow API documents "flow_id"; newer accounts may use "template_id"
    flowField: process.env.MSG91_FLOW_FIELD ?? "flow_id",
  },
};
