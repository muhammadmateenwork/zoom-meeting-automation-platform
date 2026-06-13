import { logger } from "./logger";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) throw new Error("Zoom credentials not configured");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "Failed to get Zoom token");
    throw new Error(`Zoom auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export interface ZoomMeeting {
  id: string;
  join_url: string;
  start_url: string;
  topic: string;
}

export async function createZoomMeeting(
  topic: string,
  meetingDate: string,
  meetingTime: string,
  duration = 60
): Promise<ZoomMeeting> {
  const token = await getZoomAccessToken();
  const startTime = new Date(`${meetingDate}T${meetingTime}:00`).toISOString();

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime,
      duration,
      settings: { host_video: true, participant_video: true, join_before_host: false },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom meeting creation failed: ${res.status} — ${body}`);
  }

  return (await res.json()) as ZoomMeeting;
}
