import { useState } from "react";
import { ProtectedLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useGetMeetingStats, getGetMeetingStatsQueryKey, useListMeetings, getListMeetingsQueryKey,
  useDeleteMeeting, useUpdateMeetingStatus, getGetMeetingQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Calendar, Video, Users, Trash, Plus, CheckCircle2, XCircle, Search, TrendingUp, Clock } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  scheduled: { badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  completed: { badge: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  cancelled: { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
};

const TYPE_STYLES: Record<string, string> = {
  client: "bg-violet-50 text-violet-700",
  internal: "bg-amber-50 text-amber-700",
  personal: "bg-teal-50 text-teal-700",
};

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");

  const { data: stats, isLoading: statsLoading } = useGetMeetingStats({ query: { queryKey: getGetMeetingStatsQueryKey() } });
  const { data: meetings, isLoading: meetingsLoading } = useListMeetings({ query: { queryKey: getListMeetingsQueryKey() } });
  const deleteMutation = useDeleteMeeting();
  const statusMutation = useUpdateMeetingStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function invalidate(id?: string) {
    queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeetingStatsQueryKey() });
    if (id) queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(id) });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this meeting permanently?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Meeting deleted" }); invalidate(id); },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  }

  function handleStatus(id: string, status: "completed" | "cancelled" | "scheduled") {
    statusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => { toast({ title: `Marked as ${status}` }); invalidate(id); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  const filtered = (meetings || []).filter(m => {
    const ok = filter === "all" || m.status === filter;
    const q = search.toLowerCase();
    return ok && (!q || m.meetingTitle.toLowerCase().includes(q) || m.clientName.toLowerCase().includes(q) || m.clientEmail.toLowerCase().includes(q));
  });

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {stats ? `${stats.thisMonth} this month · ${stats.upcoming} upcoming` : "Loading…"}
            </p>
          </div>
          <Link href="/meetings/new">
            <Button className="font-semibold gap-2"><Plus className="w-4 h-4" /> New Meeting</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />) : (
            <>
              {[
                { label: "Total", value: stats?.total ?? 0, icon: Calendar, color: "text-gray-500", bg: "bg-gray-100" },
                { label: "Upcoming", value: stats?.upcoming ?? 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
                { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
                { label: "Cancelled", value: stats?.cancelled ?? 0, icon: XCircle, color: "text-red-500", bg: "bg-red-100" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Meetings */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">All Meetings</h2>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input className="pl-9 h-9 w-48 text-sm bg-white border-gray-200" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
                {(["all", "scheduled", "completed", "cancelled"] as const).map(f => (
                  <button
                    key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === f ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {meetingsLoading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
              <Calendar className="w-9 h-9 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">{search || filter !== "all" ? "No matches found" : "No meetings yet"}</p>
              <p className="text-sm text-gray-400 mt-1">
                {search ? "Try different keywords." : filter !== "all" ? "Try a different filter." : "Schedule your first meeting to get started."}
              </p>
              {!search && filter === "all" && (
                <Link href="/meetings/new"><Button className="mt-5 font-semibold" size="sm">Schedule a Meeting</Button></Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => {
                const ss = STATUS_STYLES[m.status] || STATUS_STYLES.scheduled;
                return (
                  <div key={m.id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 p-4">
                      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${ss.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link href={`/meetings/${m.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-sm truncate">
                            {m.meetingTitle}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ss.badge}`}>
                            {m.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[m.meetingType] || "bg-gray-100 text-gray-600"}`}>
                            {m.meetingType}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(m.meetingDate), "MMM d, yyyy")} · {m.meetingTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {m.clientName}
                            {m.cc?.length > 0 && <span className="text-gray-300">+{m.cc.length} cc</span>}
                          </span>
                          {m.organizerCompany && <span className="text-gray-300">via {m.organizerCompany}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.zoomJoinUrl && m.status === "scheduled" && (
                          <Button asChild size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                            <a href={m.zoomJoinUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="w-3.5 h-3.5 mr-1.5" /> Join
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link href={`/meetings/${m.id}`} className="cursor-pointer">View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {m.status !== "completed" && (
                              <DropdownMenuItem onClick={() => handleStatus(m.id, "completed")} className="text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            {m.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => handleStatus(m.id, "cancelled")} className="text-red-500">
                                <XCircle className="w-3.5 h-3.5 mr-2" /> Cancel
                              </DropdownMenuItem>
                            )}
                            {m.status !== "scheduled" && (
                              <DropdownMenuItem onClick={() => handleStatus(m.id, "scheduled")}>
                                <Calendar className="w-3.5 h-3.5 mr-2" /> Reopen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500 focus:text-red-600" onClick={() => handleDelete(m.id)}>
                              <Trash className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
