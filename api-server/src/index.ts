import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "./lib/db";
import { startReminderCron } from "./cron/reminders";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Create __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

async function main() {
  await connectDB();

  // 1. Serve the compiled Vite frontend files
  const frontendPath = path.join(__dirname, "../../zoom-platform/dist/public");
  app.use(express.static(frontendPath));

  // 2. Catch-all routing: send any unknown requests to React Router
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

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