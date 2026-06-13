import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { ProtectedLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreateMeeting, getListMeetingsQueryKey, getGetMeetingStatsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { X, Plus, Users, Briefcase, User } from "lucide-react";

const schema = z.object({
  meetingType: z.enum(["client", "internal", "personal"]).default("client"),
  clientName: z.string().min(2, "Name is required"),
  clientEmail: z.string().email("Invalid email"),
  meetingTitle: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  meetingDate: z.string().min(1, "Date is required"),
  meetingTime: z.string().min(1, "Time is required"),
  duration: z.coerce.number().min(15).max(480).default(60),
  timezone: z.string().default("UTC"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Karachi",
  "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

const MEETING_TYPES = [
  { value: "client", label: "Client Meeting", icon: Briefcase, desc: "External client or partner" },
  { value: "internal", label: "Internal Meeting", icon: Users, desc: "Team or colleagues" },
  { value: "personal", label: "Personal / Self", icon: User, desc: "For yourself or solo work" },
] as const;

export default function NewMeeting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ccInput, setCcInput] = useState("");
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState("");
  const [bccList, setBccList] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      meetingType: "client", clientName: "", clientEmail: "",
      meetingTitle: "", description: "", meetingDate: "", meetingTime: "",
      duration: 60, timezone: "UTC", notes: "",
    },
  });

  const createMutation = useCreateMeeting();
  const meetingType = form.watch("meetingType");

  function addEmail(list: string[], setList: (v: string[]) => void, val: string) {
    const email = val.trim().toLowerCase();
    if (email && /\S+@\S+\.\S+/.test(email) && !list.includes(email)) {
      setList([...list, email]);
    }
  }

  function onSubmit(data: FormValues) {
    createMutation.mutate(
      { data: { ...data, cc: ccList, bcc: bccList } },
      {
        onSuccess: (meeting) => {
          toast({ title: "Meeting scheduled!", description: "Invitation email has been sent." });
          queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeetingStatsQueryKey() });
          setLocation(`/meetings/${meeting.id}`);
        },
        onError: (err: any) => {
          toast({ title: "Failed to schedule", description: err?.data?.error || "Try again", variant: "destructive" });
        },
      }
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <ProtectedLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule New Meeting</h1>
          <p className="text-muted-foreground mt-1">Fill in the details to generate a Zoom link and send invitations.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Meeting Type */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Meeting Type</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {MEETING_TYPES.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value} type="button"
                    onClick={() => form.setValue("meetingType", value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${meetingType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${meetingType === value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendee Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {meetingType === "personal" ? "Your Details" : "Attendee Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clientName">
                    {meetingType === "personal" ? "Your Name" : meetingType === "internal" ? "Attendee Name" : "Client Name"} *
                  </Label>
                  <Input id="clientName" placeholder="Jane Smith" {...form.register("clientName")} />
                  {form.formState.errors.clientName && <p className="text-xs text-destructive">{form.formState.errors.clientName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientEmail">
                    {meetingType === "personal" ? "Your Email" : "Email Address"} *
                  </Label>
                  <Input id="clientEmail" type="email" placeholder="jane@example.com" {...form.register("clientEmail")} />
                  {form.formState.errors.clientEmail && <p className="text-xs text-destructive">{form.formState.errors.clientEmail.message}</p>}
                </div>
              </div>

              {/* CC */}
              <div className="space-y-1.5">
                <Label>CC (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add email and press Enter"
                    value={ccInput}
                    onChange={e => setCcInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(ccList, setCcList, ccInput); setCcInput(""); } }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => { addEmail(ccList, setCcList, ccInput); setCcInput(""); }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {ccList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ccList.map(e => (
                      <Badge key={e} variant="secondary" className="gap-1">
                        {e} <X className="w-3 h-3 cursor-pointer" onClick={() => setCcList(ccList.filter(x => x !== e))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* BCC */}
              <div className="space-y-1.5">
                <Label>BCC (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add email and press Enter"
                    value={bccInput}
                    onChange={e => setBccInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(bccList, setBccList, bccInput); setBccInput(""); } }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => { addEmail(bccList, setBccList, bccInput); setBccInput(""); }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {bccList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {bccList.map(e => (
                      <Badge key={e} variant="secondary" className="gap-1">
                        {e} <X className="w-3 h-3 cursor-pointer" onClick={() => setBccList(bccList.filter(x => x !== e))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Meeting Details */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Meeting Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="meetingTitle">Meeting Title *</Label>
                <Input id="meetingTitle" placeholder="Project Discovery Call" {...form.register("meetingTitle")} />
                {form.formState.errors.meetingTitle && <p className="text-xs text-destructive">{form.formState.errors.meetingTitle.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Agenda / Description</Label>
                <Textarea id="description" placeholder="What will be discussed in this meeting?" rows={3} {...form.register("description")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="meetingDate">Date *</Label>
                  <Input id="meetingDate" type="date" min={today} {...form.register("meetingDate")} />
                  {form.formState.errors.meetingDate && <p className="text-xs text-destructive">{form.formState.errors.meetingDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meetingTime">Time *</Label>
                  <Input id="meetingTime" type="time" {...form.register("meetingTime")} />
                  {form.formState.errors.meetingTime && <p className="text-xs text-destructive">{form.formState.errors.meetingTime.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <select id="duration" {...form.register("duration")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {[15, 30, 45, 60, 90, 120, 180, 240].map(d => (
                      <option key={d} value={d}>{d === 60 ? "1 hour" : d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}`}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select id="timezone" {...form.register("timezone")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <div>
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? "− Hide" : "+ Add"} internal notes
            </button>
            {showAdvanced && (
              <Card className="mt-3">
                <CardContent className="pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Internal Notes (not sent to attendee)</Label>
                    <Textarea id="notes" placeholder="Preparation notes, context, follow-ups..." rows={3} {...form.register("notes")} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setLocation("/dashboard")}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="min-w-[160px]">
              {createMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedLayout>
  );
}
