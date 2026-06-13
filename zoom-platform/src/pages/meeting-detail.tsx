import { useState } from "react";
import { ProtectedLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useGetMeeting, getGetMeetingQueryKey, useDeleteMeeting, getListMeetingsQueryKey,
  getGetMeetingStatsQueryKey, useResendInvitation, useCancelMeeting, useRescheduleMeeting,
  useUpdateMeetingStatus,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  CalendarIcon, Video, Users, Trash, Clock, Mail, CheckCircle2, RefreshCw,
  XCircle, CalendarCheck, ArrowLeft, Building2, StickyNote, Phone,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function MeetingDetail({ params }: { params: { id: string } }) {
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const { data: meeting, isLoading } = useGetMeeting(id, { query: { enabled: !!id, queryKey: getGetMeetingQueryKey(id) } });
  const deleteMutation = useDeleteMeeting();
  const resendMutation = useResendInvitation();
  const cancelMutation = useCancelMeeting();
  const rescheduleMutation = useRescheduleMeeting();
  const statusMutation = useUpdateMeetingStatus();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeetingStatsQueryKey() });
  }

  function handleDelete() {
    if (!confirm("Permanently delete this meeting?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Meeting deleted" }); setLocation("/dashboard"); },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  }

  function handleResend() {
    resendMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Invitation resent" }); invalidate(); },
      onError: () => toast({ title: "Resend failed", variant: "destructive" }),
    });
  }

  function handleCancel() {
    if (!cancelReason.trim()) { toast({ title: "Enter a reason", variant: "destructive" }); return; }
    cancelMutation.mutate({ id, data: { reason: cancelReason } }, {
      onSuccess: () => { toast({ title: "Meeting cancelled", description: "Cancellation email sent." }); setCancelDialog(false); setCancelReason(""); invalidate(); },
      onError: () => toast({ title: "Cancel failed", variant: "destructive" }),
    });
  }

  function handleReschedule() {
    if (!newDate || !newTime) { toast({ title: "Select date and time", variant: "destructive" }); return; }
    rescheduleMutation.mutate({ id, data: { meetingDate: newDate, meetingTime: newTime, reason: rescheduleNote || undefined } }, {
      onSuccess: () => { toast({ title: "Rescheduled", description: "Notification sent to attendee." }); setRescheduleDialog(false); setNewDate(""); setNewTime(""); setRescheduleNote(""); invalidate(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleStatus(status: "scheduled" | "completed" | "cancelled") {
    statusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => { toast({ title: `Marked as ${status}` }); invalidate(); },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    });
  }

  if (!id || (!isLoading && !meeting)) return (
    <ProtectedLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Meeting not found.</p>
        <Link href="/dashboard"><Button size="sm">Back to Dashboard</Button></Link>
      </div>
    </ProtectedLayout>
  );

  if (isLoading) return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-8 w-40" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" />
      </div>
    </ProtectedLayout>
  );

  const today = new Date().toISOString().split("T")[0];
  const isScheduled = meeting!.status === "scheduled";

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>

        {/* Header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-gray-900">{meeting!.meetingTitle}</h1>
                <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${STATUS_STYLES[meeting!.status]}`}>
                  {meeting!.status.charAt(0).toUpperCase() + meeting!.status.slice(1)}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {meeting!.meetingType}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5" />
                {format(new Date(meeting!.meetingDate), "EEEE, MMMM d, yyyy")} at {meeting!.meetingTime}
                <span className="text-gray-300">·</span>
                <Clock className="w-3.5 h-3.5" /> {meeting!.duration} min
                <span className="text-gray-300">·</span>
                {meeting!.timezone}
              </p>
              {meeting!.rescheduledFrom && (
                <p className="text-xs text-amber-600 mt-1">Rescheduled from: {meeting!.rescheduledFrom}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {isScheduled && (
                <>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setRescheduleDialog(true)}>
                    <CalendarCheck className="w-3.5 h-3.5" /> Reschedule
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleResend} disabled={resendMutation.isPending}>
                    <RefreshCw className="w-3.5 h-3.5" /> Resend Email
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-green-700 border-green-200 hover:bg-green-50" onClick={() => handleStatus("completed")}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelDialog(true)}>
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </Button>
                </>
              )}
              {meeting!.status !== "scheduled" && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleStatus("scheduled")}>
                  <CalendarIcon className="w-3.5 h-3.5" /> Reopen
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-gray-400 hover:text-red-500" onClick={handleDelete}>
                <Trash className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Attendee */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Attendee
            </h3>
            <p className="font-semibold text-gray-900">{meeting!.clientName}</p>
            <p className="text-sm text-blue-600 mb-3">{meeting!.clientEmail}</p>
            {meeting!.cc?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-400 mb-1.5 font-medium">CC</p>
                <div className="flex flex-wrap gap-1.5">
                  {meeting!.cc.map(e => <span key={e} className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-600">{e}</span>)}
                </div>
              </div>
            )}
            {meeting!.bcc?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">BCC</p>
                <div className="flex flex-wrap gap-1.5">
                  {meeting!.bcc.map(e => <span key={e} className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-gray-600">{e}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Organizer */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Organizer
            </h3>
            {meeting!.organizerName && <p className="font-semibold text-gray-900">{meeting!.organizerName}</p>}
            {meeting!.organizerTitle && meeting!.organizerCompany && (
              <p className="text-sm text-gray-500">{meeting!.organizerTitle} · {meeting!.organizerCompany}</p>
            )}
            {meeting!.organizerTitle && !meeting!.organizerCompany && <p className="text-sm text-gray-500">{meeting!.organizerTitle}</p>}
            {!meeting!.organizerTitle && meeting!.organizerCompany && <p className="text-sm font-medium text-gray-700">{meeting!.organizerCompany}</p>}
            {meeting!.organizerEmail && <p className="text-sm text-blue-600 mt-0.5">{meeting!.organizerEmail}</p>}
            {(meeting as any).organizerPhone && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3" /> {(meeting as any).organizerPhone}
              </p>
            )}
          </div>

          {/* Zoom */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Video className="w-3.5 h-3.5" /> Zoom Meeting
            </h3>
            {meeting!.zoomJoinUrl ? (
              <div className="space-y-3">
                {meeting!.zoomMeetingId && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Meeting ID</p>
                    <p className="font-mono text-sm text-gray-700">{meeting!.zoomMeetingId}</p>
                  </div>
                )}
                {isScheduled && (
                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" className="flex-1 bg-[#0e71eb] hover:bg-[#0b5dc4] text-white text-xs">
                      <a href={meeting!.zoomStartUrl ?? meeting!.zoomJoinUrl!} target="_blank" rel="noopener noreferrer">Start (Host)</a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                      <a href={meeting!.zoomJoinUrl!} target="_blank" rel="noopener noreferrer">Join (Guest)</a>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No Zoom link — check your Zoom credentials.</p>
            )}
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5" /> Details
            </h3>
            {meeting!.description && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1 font-medium">Agenda</p>
                <p className="text-sm text-gray-700 leading-relaxed">{meeting!.description}</p>
              </div>
            )}
            {meeting!.notes && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1 font-medium">Internal Notes</p>
                <p className="text-sm text-gray-500 leading-relaxed">{meeting!.notes}</p>
              </div>
            )}
            {meeting!.cancelReason && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">Cancellation Reason</p>
                <p className="text-sm text-red-700">{meeting!.cancelReason}</p>
              </div>
            )}
            {!meeting!.description && !meeting!.notes && !meeting!.cancelReason && (
              <p className="text-sm text-gray-400">No additional details.</p>
            )}
          </div>
        </div>

        {/* Email History */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> Email History
          </h3>
          <div className="space-y-2">
            {[
              { label: "Initial Invitation", sub: "Sent when meeting is created", ts: meeting!.emailSentAt },
              { label: "Reschedule Notification", sub: "Sent when time is changed", ts: meeting!.rescheduleEmailSentAt },
              { label: "24-Hour Reminder", sub: "1 day before meeting", ts: meeting!.reminder24SentAt },
              { label: "1-Hour Reminder", sub: "1 hour before meeting", ts: meeting!.reminder1SentAt },
              { label: "Cancellation Notice", sub: "Sent when cancelled", ts: meeting!.cancellationEmailSentAt },
            ].map(({ label, sub, ts }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ts ? "bg-green-100" : "bg-gray-100"}`}>
                    {ts
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      : <Clock className="w-3.5 h-3.5 text-gray-400" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
                {ts
                  ? <span className="text-xs text-green-700 font-medium">{format(new Date(ts), "MMM d, h:mm a")}</span>
                  : <span className="text-xs text-gray-300">Pending</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Meeting</DialogTitle>
            <DialogDescription>
              A cancellation email will be sent to <strong>{meeting?.clientEmail}</strong>. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-sm font-medium">Reason for cancellation <span className="text-red-500">*</span></Label>
            <Textarea
              rows={3} placeholder="e.g. Schedule conflict, project on hold…"
              value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              className="bg-gray-50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Keep Meeting</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? "Cancelling…" : "Cancel & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Meeting</DialogTitle>
            <DialogDescription>
              A reschedule notification will be sent to <strong>{meeting?.clientEmail}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">New Date <span className="text-red-500">*</span></Label>
                <Input type="date" min={today} value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">New Time <span className="text-red-500">*</span></Label>
                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="bg-gray-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Note (optional)</Label>
              <Textarea rows={2} placeholder="Reason for rescheduling…" value={rescheduleNote} onChange={e => setRescheduleNote(e.target.value)} className="bg-gray-50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(false)}>Go Back</Button>
            <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending}>
              {rescheduleMutation.isPending ? "Rescheduling…" : "Reschedule & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
