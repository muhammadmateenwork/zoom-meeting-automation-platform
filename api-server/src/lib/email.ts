import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Notifications <onboarding@resend.dev>";

export interface OrganizerInfo {
  name: string;
  email: string;
  company?: string | null;
  title?: string | null;
  phone?: string | null;
}

function signature(org: OrganizerInfo): string {
  const lines: string[] = [];
  if (org.name) lines.push(`<strong style="color:#111827;font-size:14px">${org.name}</strong>`);
  if (org.title && org.company) lines.push(`<span style="color:#6b7280">${org.title} &bull; ${org.company}</span>`);
  else if (org.title) lines.push(`<span style="color:#6b7280">${org.title}</span>`);
  else if (org.company) lines.push(`<span style="color:#374151;font-weight:600">${org.company}</span>`);
  if (org.email) lines.push(`<a href="mailto:${org.email}" style="color:#2563eb;text-decoration:none">${org.email}</a>`);
  if (org.phone) lines.push(`<span style="color:#6b7280">${org.phone}</span>`);
  return `
<div style="margin-top:32px;padding-top:16px;border-top:2px solid #f3f4f6;font-size:13px;line-height:1.8">
  ${lines.join("<br/>")}
</div>`;
}

function emailWrapper(accentColor: string, badge: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
  <tr>
    <td style="padding-bottom:8px">
      <span style="display:inline-block;background:${accentColor};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px">${badge}</span>
    </td>
  </tr>
  <tr>
    <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:36px 40px;color:#374151">
      ${body}
    </td>
  </tr>
  <tr>
    <td style="padding-top:20px;text-align:center;font-size:11px;color:#9ca3af">
      This is an automated meeting notification. Please do not reply to this email.
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function meetingInfoTable(title: string, date: string, time: string, duration: number, tz: string, description?: string | null): string {
  return `
<h2 style="margin:20px 0 16px;font-size:20px;font-weight:700;color:#111827">${title}</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
  <tr>
    <td style="padding:10px 14px;background:#f3f4f6;border-radius:6px 6px 0 0;border-bottom:1px solid #e5e7eb;width:110px">
      <span style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Date</span>
    </td>
    <td style="padding:10px 14px;background:#f3f4f6;border-radius:6px 6px 0 0;border-bottom:1px solid #e5e7eb">
      <span style="font-size:14px;font-weight:600;color:#111827">${date}</span>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb">
      <span style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Time</span>
    </td>
    <td style="padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb">
      <span style="font-size:14px;font-weight:600;color:#111827">${time}</span>
      <span style="font-size:12px;color:#9ca3af;margin-left:6px">${tz}</span>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 14px;background:#f3f4f6;border-radius:0 0 6px 6px">
      <span style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Duration</span>
    </td>
    <td style="padding:10px 14px;background:#f3f4f6;border-radius:0 0 6px 6px">
      <span style="font-size:14px;font-weight:600;color:#111827">${duration} minutes</span>
    </td>
  </tr>
</table>
${description ? `<p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.7;padding:14px 16px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 6px 6px 0">${description}</p>` : ""}`;
}

function joinButton(url: string, label = "Join Zoom Meeting"): string {
  return `
<div style="text-align:center;margin:28px 0 20px">
  <a href="${url}" style="display:inline-block;background:#0e71eb;color:#ffffff;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:.2px">${label}</a>
</div>
<p style="text-align:center;margin:0;font-size:12px;color:#9ca3af">Or use this link: <a href="${url}" style="color:#2563eb;word-break:break-all">${url}</a></p>`;
}

export async function sendMeetingInvitation(opts: {
  to: string;
  cc?: string[];
  bcc?: string[];
  clientName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  timezone: string;
  description?: string | null;
  zoomJoinUrl: string | null;
  organizer: OrganizerInfo;
}): Promise<void> {
  const salutation = opts.organizer.company ? `from ${opts.organizer.company}` : `from ${opts.organizer.name}`;
  const body = `
<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 4px">Hello ${opts.clientName},</p>
<p style="color:#6b7280;margin:0 0 24px;font-size:14px">You have been invited to a meeting ${salutation}.</p>
${meetingInfoTable(opts.meetingTitle, opts.meetingDate, opts.meetingTime, opts.duration, opts.timezone, opts.description)}
${opts.zoomJoinUrl ? joinButton(opts.zoomJoinUrl) : `<p style="text-align:center;color:#9ca3af;font-style:italic;padding:20px 0">The Zoom link will be shared with you shortly.</p>`}
${signature(opts.organizer)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: [opts.to],
    cc: opts.cc?.length ? opts.cc : undefined,
    bcc: opts.bcc?.length ? opts.bcc : undefined,
    subject: `Meeting Invitation: ${opts.meetingTitle}`,
    html: emailWrapper("#2563eb", "Meeting Invitation", body),
  });

  if (error) { logger.error({ error, to: opts.to }, "Invitation send failed"); throw new Error(error.message); }
  logger.info({ clientEmail: opts.to, meetingTitle: opts.meetingTitle }, "Invitation email sent");
}

export async function sendReminderEmail(opts: {
  to: string;
  cc?: string[];
  clientName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  timezone: string;
  zoomJoinUrl: string | null;
  organizer: OrganizerInfo;
  hoursUntil: number;
}): Promise<void> {
  const when = opts.hoursUntil === 24 ? "tomorrow" : "in 1 hour";
  const accentColor = opts.hoursUntil === 24 ? "#0f172a" : "#dc2626";
  const badge = opts.hoursUntil === 24 ? "24-Hour Reminder" : "Starting Soon";
  const body = `
<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 4px">Hello ${opts.clientName},</p>
<p style="color:#6b7280;margin:0 0 24px;font-size:14px">This is a reminder that your meeting starts <strong style="color:#111827">${when}</strong>.</p>
${meetingInfoTable(opts.meetingTitle, opts.meetingDate, opts.meetingTime, opts.duration, opts.timezone)}
${opts.zoomJoinUrl ? joinButton(opts.zoomJoinUrl, "Join Meeting Now") : ""}
${signature(opts.organizer)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: [opts.to],
    cc: opts.cc?.length ? opts.cc : undefined,
    subject: `Reminder: "${opts.meetingTitle}" is ${when}`,
    html: emailWrapper(accentColor, badge, body),
  });

  if (error) { logger.error({ error }, "Reminder send failed"); throw new Error(error.message); }
  logger.info({ to: opts.to, hoursUntil: opts.hoursUntil }, "Reminder email sent");
}

export async function sendCancellationEmail(opts: {
  to: string;
  cc?: string[];
  bcc?: string[];
  clientName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  reason: string;
  organizer: OrganizerInfo;
}): Promise<void> {
  const body = `
<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 4px">Hello ${opts.clientName},</p>
<p style="color:#6b7280;margin:0 0 24px;font-size:14px">We regret to inform you that the following meeting has been cancelled.</p>
<div style="border:1px solid #fecaca;border-radius:8px;padding:20px 24px;margin-bottom:20px;background:#fef2f2">
  <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111827">${opts.meetingTitle}</p>
  <p style="margin:0;font-size:13px;color:#9ca3af">Was scheduled for <strong style="color:#6b7280">${opts.meetingDate}</strong> at <strong style="color:#6b7280">${opts.meetingTime}</strong></p>
</div>
${opts.reason ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:20px"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px">Reason</p><p style="margin:0;font-size:14px;color:#78350f">${opts.reason}</p></div>` : ""}
<p style="font-size:14px;color:#6b7280;margin:0 0 8px">If you have any questions, please reach out directly.</p>
${signature(opts.organizer)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: [opts.to],
    cc: opts.cc?.length ? opts.cc : undefined,
    bcc: opts.bcc?.length ? opts.bcc : undefined,
    subject: `Cancelled: ${opts.meetingTitle}`,
    html: emailWrapper("#dc2626", "Meeting Cancelled", body),
  });

  if (error) { logger.error({ error }, "Cancellation send failed"); throw new Error(error.message); }
  logger.info({ to: opts.to }, "Cancellation email sent");
}

export async function sendRescheduleEmail(opts: {
  to: string;
  cc?: string[];
  bcc?: string[];
  clientName: string;
  meetingTitle: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  duration: number;
  timezone: string;
  reason?: string;
  zoomJoinUrl: string | null;
  organizer: OrganizerInfo;
}): Promise<void> {
  const body = `
<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 4px">Hello ${opts.clientName},</p>
<p style="color:#6b7280;margin:0 0 24px;font-size:14px">Your meeting has been rescheduled. Please note the updated details below.</p>
<div style="margin-bottom:20px">
  <div style="padding:12px 16px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px;display:flex;align-items:center">
    <span style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;width:70px">Previous</span>
    <span style="font-size:13px;color:#9ca3af;text-decoration:line-through">${opts.oldDate} at ${opts.oldTime}</span>
  </div>
  <div style="padding:12px 16px;border:2px solid #7c3aed;border-radius:6px;background:#faf5ff">
    <span style="font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.5px">New Time &nbsp;→&nbsp; </span>
    <span style="font-size:14px;font-weight:700;color:#5b21b6">${opts.newDate} at ${opts.newTime} <span style="font-weight:400;color:#7c3aed;font-size:12px">(${opts.timezone})</span></span>
  </div>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
  <tr>
    <td style="padding:10px 14px;background:#f3f4f6;border-radius:6px">
      <span style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Title</span>&nbsp;&nbsp;
      <span style="font-size:14px;font-weight:600;color:#111827">${opts.meetingTitle}</span>
    </td>
  </tr>
</table>
${opts.reason ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:20px"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px">Note</p><p style="margin:0;font-size:14px;color:#78350f">${opts.reason}</p></div>` : ""}
${opts.zoomJoinUrl ? joinButton(opts.zoomJoinUrl) : ""}
${signature(opts.organizer)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: [opts.to],
    cc: opts.cc?.length ? opts.cc : undefined,
    bcc: opts.bcc?.length ? opts.bcc : undefined,
    subject: `Rescheduled: ${opts.meetingTitle} → ${opts.newDate} at ${opts.newTime}`,
    html: emailWrapper("#7c3aed", "Meeting Rescheduled", body),
  });

  if (error) { logger.error({ error }, "Reschedule send failed"); throw new Error(error.message); }
  logger.info({ to: opts.to }, "Reschedule email sent");
}
