import cron from "node-cron";
import { Meeting } from "../models/Meeting";
import { User } from "../models/User";
import { sendReminderEmail } from "../lib/email";
import { logger } from "../lib/logger";

export function startReminderCron(): void {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    try {
      const meetings = await Meeting.find({ status: "scheduled" });
      for (const m of meetings) {
        const meetingDt = new Date(`${m.meetingDate}T${m.meetingTime}:00`);
        const diffMs = meetingDt.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffMs < 0) {
          await Meeting.findByIdAndUpdate(m._id, { status: "completed" });
          continue;
        }

        const user = await User.findById(m.userId);
        const org = {
          name: m.organizerName || user?.name || "Meeting Organizer",
          email: m.organizerEmail || user?.email || "",
          company: m.organizerCompany || user?.companyName,
          title: m.organizerTitle || user?.jobTitle,
          phone: (m as any).organizerPhone || user?.phone,
        };

        if (diffHours >= 23.5 && diffHours < 24.5 && !m.reminder24SentAt) {
          try {
            await sendReminderEmail({
              to: m.clientEmail, cc: m.cc,
              clientName: m.clientName, meetingTitle: m.meetingTitle,
              meetingDate: m.meetingDate, meetingTime: m.meetingTime,
              duration: m.duration, timezone: m.timezone,
              zoomJoinUrl: m.zoomJoinUrl, organizer: org, hoursUntil: 24,
            });
            await Meeting.findByIdAndUpdate(m._id, { reminder24SentAt: new Date() });
            logger.info({ meetingId: m._id }, "24h reminder sent");
          } catch (err) {
            logger.error({ err, meetingId: m._id }, "24h reminder failed");
          }
        }

        if (diffHours >= 0.5 && diffHours < 1.5 && !m.reminder1SentAt) {
          try {
            await sendReminderEmail({
              to: m.clientEmail, cc: m.cc,
              clientName: m.clientName, meetingTitle: m.meetingTitle,
              meetingDate: m.meetingDate, meetingTime: m.meetingTime,
              duration: m.duration, timezone: m.timezone,
              zoomJoinUrl: m.zoomJoinUrl, organizer: org, hoursUntil: 1,
            });
            await Meeting.findByIdAndUpdate(m._id, { reminder1SentAt: new Date() });
            logger.info({ meetingId: m._id }, "1h reminder sent");
          } catch (err) {
            logger.error({ err, meetingId: m._id }, "1h reminder failed");
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "Cron error");
    }
  });
  logger.info("Reminder cron started");
}
