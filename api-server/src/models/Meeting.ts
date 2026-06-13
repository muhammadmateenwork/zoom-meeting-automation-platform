import mongoose, { Document, Schema } from "mongoose";

export interface IMeeting extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  meetingType: "client" | "internal" | "personal";
  clientName: string;
  clientEmail: string;
  cc: string[];
  bcc: string[];
  meetingTitle: string;
  description: string | null;
  meetingDate: string;
  meetingTime: string;
  duration: number;
  timezone: string;
  organizerName: string | null;
  organizerEmail: string | null;
  organizerCompany: string | null;
  organizerTitle: string | null;
  organizerPhone: string | null;
  zoomMeetingId: string | null;
  zoomJoinUrl: string | null;
  zoomStartUrl: string | null;
  status: "scheduled" | "completed" | "cancelled";
  cancelReason: string | null;
  cancelledAt: Date | null;
  rescheduledFrom: string | null;
  notes: string | null;
  emailSentAt: Date | null;
  reminder24SentAt: Date | null;
  reminder1SentAt: Date | null;
  cancellationEmailSentAt: Date | null;
  rescheduleEmailSentAt: Date | null;
  createdAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    meetingType: { type: String, enum: ["client", "internal", "personal"], default: "client" },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, lowercase: true, trim: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    meetingTitle: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    meetingDate: { type: String, required: true },
    meetingTime: { type: String, required: true },
    duration: { type: Number, default: 60 },
    timezone: { type: String, default: "UTC" },
    organizerName: { type: String, default: null },
    organizerEmail: { type: String, default: null },
    organizerCompany: { type: String, default: null },
    organizerTitle: { type: String, default: null },
    organizerPhone: { type: String, default: null },
    zoomMeetingId: { type: String, default: null },
    zoomJoinUrl: { type: String, default: null },
    zoomStartUrl: { type: String, default: null },
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
    cancelReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    rescheduledFrom: { type: String, default: null },
    notes: { type: String, default: null },
    emailSentAt: { type: Date, default: null },
    reminder24SentAt: { type: Date, default: null },
    reminder1SentAt: { type: Date, default: null },
    cancellationEmailSentAt: { type: Date, default: null },
    rescheduleEmailSentAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Meeting = mongoose.model<IMeeting>("Meeting", meetingSchema);
