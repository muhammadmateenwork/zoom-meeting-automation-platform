import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "./lib/db";
import { startReminderCron } from "./cron/reminders";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

async function main() {
  await connectDB();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error starting server");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    startReminderCron();
  });
}

main().catch(err => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
