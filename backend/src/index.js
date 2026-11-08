import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { startExpiryJob } from "./jobs/expire.js";
import { startMessageQueue } from "./jobs/messages.js";
import { startReminders } from "./jobs/reminders.js";

const server = createApp().listen(config.port, () => {
  console.log(`Vitalyn API listening on http://localhost:${config.port}`);
});

const jobs = [startExpiryJob(), startMessageQueue(), startReminders()];

const shutdown = async () => {
  jobs.forEach(clearInterval);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
