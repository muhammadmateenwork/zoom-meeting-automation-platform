import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { Meeting } from "../models/Meeting";
import { User } from "../models/User";
import { CreateMeetingBody, UpdateMeetingBody, CancelMeetingBody, RescheduleMeetingBody, UpdateMeetingStatusBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { createZoomMeeting } from "../lib/zoom";
import { sendMeetingInvitation, sendCancellationEmail, sendRescheduleEmail, sendReminderEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function fmt(m: any) {
  return {
    id: m._id.toString(),
    userId: m.userId.toString(),
    meetingType: m.meetingType,
    clientName: m.clientName,
    clientEmail: m.clientEmail,
    cc: m.cc ?? [],
    bcc: m.bcc ?? [],
    meetingTitle: m.meetingTitle,
    description: m.description ?? null,
    meetingDate: m.meetingDate,
    meetingTime: m.meetingTime,
    duration: m.duration ?? 60,
    timezone: m.timezone ?? "UTC",
    organizerName: m.organizerName ?? null,
    organizerEmail: m.organizerEmail ?? null,
    organizerCompany: m.organizerCompany ?? null,
    organizerTitle: m.organizerTitle ?? null,
    organizerPhone: m.organizerPhone ?? null,
    zoomMeetingId: m.zoomMeetingId ?? null,
    zoomJoinUrl: m.zoomJoinUrl ?? null,
    zoomStartUrl: m.zoomStartUrl ?? null,
    status: m.status,
    cancelReason: m.cancelReason ?? null,
    cancelledAt: m.cancelledAt?.toISOString() ?? null,
    rescheduledFrom: m.rescheduledFrom ?? null,
    notes: m.notes ?? null,
    emailSentAt: m.emailSentAt?.toISOString() ?? null,
    reminder24SentAt: m.reminder24SentAt?.toISOString() ?? null,
    reminder1SentAt: m.reminder1SentAt?.toISOString() ?? null,
    cancellationEmailSentAt: m.cancellationEmailSentAt?.toISOString() ?? null,
    rescheduleEmailSentAt: m.rescheduleEmailSentAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

async function buildOrg(userId: string) {
  const user = await User.findById(userId);
  return {
    name: user?.name || "Meeting Organizer",
    email: user?.email || "",
    company: user?.companyName,
    title: user?.jobTitle,
    phone: user?.phone,
  };
}

router.get("/meetings/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const now = new Date();
  const all = await Meeting.find({ userId });
  const upcoming = all.filter(m => m.status === "scheduled" && new Date(`${m.meetingDate}T${m.meetingTime}:00`) > now);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  res.json({
    total: all.length,
    upcoming: upcoming.length,
    completed: all.filter(m => m.status === "completed").length,
    cancelled: all.filter(m => m.status === "cancelled").length,
    thisWeek: all.filter(m => new Date(`${m.meetingDate}T${m.meetingTime}:00`) >= weekStart).length,
    thisMonth: all.filter(m => new Date(`${m.meetingDate}T${m.meetingTime}:00`) >= monthStart).length,
  });
});

router.get("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const meetings = await Meeting.find({ userId: new mongoose.Types.ObjectId(req.userId) }).sort({ createdAt: -1 });
  res.json(meetings.map(fmt));
});

router.post("/meetings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateMeetingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  const org = await buildOrg(req.userId!);

  let zoomMeetingId: string | null = null;
  let zoomJoinUrl: string | null = null;
  let zoomStartUrl: string | null = null;

  try {
    const zoom = await createZoomMeeting(data.meetingTitle, data.meetingDate, data.meetingTime, data.duration ?? 60);
    zoomMeetingId = String(zoom.id); zoomJoinUrl = zoom.join_url; zoomStartUrl = zoom.start_url;
    req.log.info({ zoomMeetingId }, "Zoom meeting created");
  } catch (err) { req.log.warn({ err }, "Zoom creation failed"); }

  const meeting = await Meeting.create({
    userId: new mongoose.Types.ObjectId(req.userId),
    meetingType: data.meetingType ?? "client",
    clientName: data.clientName, clientEmail: data.clientEmail,
    cc: data.cc ?? [], bcc: data.bcc ?? [],
    meetingTitle: data.meetingTitle, description: data.description ?? null,
    meetingDate: data.meetingDate, meetingTime: data.meetingTime,
    duration: data.duration ?? 60, timezone: data.timezone ?? "UTC",
    organizerName: org.name, organizerEmail: org.email,
    organizerCompany: org.company, organizerTitle: org.title,
    organizerPhone: org.phone,
    zoomMeetingId, zoomJoinUrl, zoomStartUrl,
    notes: data.notes ?? null, status: "scheduled",
  });

  sendMeetingInvitation({
    to: meeting.clientEmail, cc: meeting.cc, bcc: meeting.bcc,
    clientName: meeting.clientName, meetingTitle: meeting.meetingTitle,
    meetingDate: meeting.meetingDate, meetingTime: meeting.meetingTime,
    duration: meeting.duration, timezone: meeting.timezone, description: meeting.description,
    zoomJoinUrl: meeting.zoomJoinUrl, organizer: org,
  })
    .then(() => Meeting.findByIdAndUpdate(meeting._id, { emailSentAt: new Date() }))
    .catch(err => logger.error({ err }, "Invitation send failed"));

  res.status(201).json(fmt(meeting));
});

router.get("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.userId });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(meeting));
});

router.put("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = UpdateMeetingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const meeting = await Meeting.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { $set: parsed.data }, { new: true });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(meeting));
});

router.delete("/meetings/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

router.post("/meetings/:id/resend", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.userId });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  const org = await buildOrg(req.userId!);
  await sendMeetingInvitation({
    to: meeting.clientEmail, cc: meeting.cc, bcc: meeting.bcc,
    clientName: meeting.clientName, meetingTitle: meeting.meetingTitle,
    meetingDate: meeting.meetingDate, meetingTime: meeting.meetingTime,
    duration: meeting.duration, timezone: meeting.timezone, description: meeting.description,
    zoomJoinUrl: meeting.zoomJoinUrl, organizer: org,
  });
  await Meeting.findByIdAndUpdate(meeting._id, { emailSentAt: new Date() });
  res.json({ message: "Invitation resent successfully" });
});

router.post("/meetings/:id/cancel", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = CancelMeetingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.userId });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  const org = await buildOrg(req.userId!);
  await Meeting.findByIdAndUpdate(meeting._id, { status: "cancelled", cancelReason: parsed.data.reason, cancelledAt: new Date() });
  sendCancellationEmail({
    to: meeting.clientEmail, cc: meeting.cc, bcc: meeting.bcc,
    clientName: meeting.clientName, meetingTitle: meeting.meetingTitle,
    meetingDate: meeting.meetingDate, meetingTime: meeting.meetingTime,
    reason: parsed.data.reason, organizer: org,
  })
    .then(() => Meeting.findByIdAndUpdate(meeting._id, { cancellationEmailSentAt: new Date() }))
    .catch(err => logger.error({ err }, "Cancellation email failed"));
  const updated = await Meeting.findById(meeting._id);
  res.json(fmt(updated));
});

router.post("/meetings/:id/reschedule", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = RescheduleMeetingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.userId });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  const org = await buildOrg(req.userId!);
  const oldDate = meeting.meetingDate; const oldTime = meeting.meetingTime;
  await Meeting.findByIdAndUpdate(meeting._id, {
    meetingDate: parsed.data.meetingDate, meetingTime: parsed.data.meetingTime,
    rescheduledFrom: `${oldDate} ${oldTime}`, status: "scheduled",
    reminder24SentAt: null, reminder1SentAt: null,
  });
  sendRescheduleEmail({
    to: meeting.clientEmail, cc: meeting.cc, bcc: meeting.bcc,
    clientName: meeting.clientName, meetingTitle: meeting.meetingTitle,
    oldDate, oldTime, newDate: parsed.data.meetingDate, newTime: parsed.data.meetingTime,
    duration: meeting.duration, timezone: meeting.timezone, reason: parsed.data.reason,
    zoomJoinUrl: meeting.zoomJoinUrl, organizer: org,
  })
    .then(() => Meeting.findByIdAndUpdate(meeting._id, { rescheduleEmailSentAt: new Date() }))
    .catch(err => logger.error({ err }, "Reschedule email failed"));
  const updated = await Meeting.findById(meeting._id);
  res.json(fmt(updated));
});

router.put("/meetings/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
  const parsed = UpdateMeetingStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const meeting = await Meeting.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { status: parsed.data.status }, { new: true });
  if (!meeting) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(meeting));
});

export default router;
