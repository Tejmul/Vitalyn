import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { hospitalsRouter } from "./routes/hospitals.js";
import { eventsRouter } from "./routes/events.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { manageRouter } from "./routes/manage.js";
import { adminRouter } from "./routes/admin.js";
import { profilesRouter } from "./routes/profiles.js";
import { meRouter } from "./routes/me.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { savedRouter } from "./routes/saved.js";
import { promotionsRouter } from "./routes/promotions.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", config.trustProxy);
  app.use(helmet());
  // credentials: true lets the browser send the httpOnly refresh cookie
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  if (!config.isProd) app.use(morgan("dev"));
  app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use("/api/auth", authRouter);
  app.use("/api/hospitals", hospitalsRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/manage", manageRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/profiles", profilesRouter);
  app.use("/api/me", meRouter);
  app.use("/api/onboarding", onboardingRouter);
  app.use("/api/saved", savedRouter);
  app.use("/api/promotions", promotionsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
