import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Send, CheckCircle2, ArrowLeft, MessageSquare, Clock, ShieldCheck, CircleDot, ChevronRight, Paperclip, X, FileText } from "lucide-react";
import { SupportChatThread } from "@/components/SupportChatThread";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";

type ViewMode = "list" | "form" | "detail" | "submitted";

export default function SupportTicketForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_BYTES = 10 * 1024 * 1024;
  const MAX_FILES = 6;

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = "";
    if (incoming.length === 0) return;
    const accepted: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" is too large (max 10 MB)`);
        continue;
      }
      accepted.push(f);
    }
    setPendingFiles((prev) => {
      const next = [...prev, ...accepted];
      if (next.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const ticketTypes = [
    { value: "feedback", label: t("support.feedback") },
    { value: "bug", label: t("support.bug") },
    { value: "help", label: t("support.help_question") },
    { value: "appeal", label: t("support.appeal") },
    { value: "other", label: t("support.other") },
  ];

  const { data: myTickets = [], isLoading } = useQuery({
    queryKey: ["my_tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Unread staff-reply counts per ticket
  const { data: unreadByTicket = {} as Record<string, number> } = useQuery({
    queryKey: ["my_ticket_unread", user?.id, myTickets.map((t: any) => t.id).join(",")],
    queryFn: async () => {
      if (!user || myTickets.length === 0) return {} as Record<string, number>;
      const ticketIds = myTickets.map((t: any) => t.id);
      const [{ data: reads }, { data: msgs }] = await Promise.all([
        supabase
          .from("support_ticket_reads" as any)
          .select("ticket_id, last_read_at")
          .eq("user_id", user.id)
          .in("ticket_id", ticketIds),
        supabase
          .from("support_ticket_messages" as any)
          .select("ticket_id, created_at, is_staff, sender_id")
          .in("ticket_id", ticketIds)
          .eq("is_staff", true),
      ]);
      const lastRead: Record<string, string> = {};
      (reads || []).forEach((r: any) => { lastRead[r.ticket_id] = r.last_read_at; });
      const counts: Record<string, number> = {};
      (msgs || []).forEach((m: any) => {
        if (m.sender_id === user.id) return;
        const lr = lastRead[m.ticket_id];
        if (!lr || new Date(m.created_at) > new Date(lr)) {
          counts[m.ticket_id] = (counts[m.ticket_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user && myTickets.length > 0,
    refetchOnWindowFocus: true,
  });

  // Realtime: any new staff reply on my tickets refreshes badges
  useEffect(() => {
    if (!user || myTickets.length === 0) return;
    const ticketIds = myTickets.map((t: any) => t.id);
    const channel = supabase
      .channel(`my-ticket-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages" },
        (payload: any) => {
          if (ticketIds.includes(payload.new?.ticket_id) && payload.new?.is_staff) {
            queryClient.invalidateQueries({ queryKey: ["my_ticket_unread"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, myTickets, queryClient]);

  // Auto-open ticket if ?ticket=<id> is in URL (from notification click)
  useEffect(() => {
    const id = searchParams.get("ticket");
    if (!id || myTickets.length === 0) return;
    const found = myTickets.find((t: any) => t.id === id);
    if (found) {
      setSelectedTicket(found);
      setView("detail");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, myTickets]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user!.id,
          type,
          subject: subject.trim(),
          message: message.trim(),
        })
        .select("id")
        .single();
      if (error || !ticket) throw error || new Error("Failed");

      // Upload attachments (if any) and attach to a first message
      if (pendingFiles.length > 0) {
        const uploaded: { url: string; name: string; type: string | null; size: number }[] = [];
        for (const file of pendingFiles) {
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `${ticket.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("support-attachments")
            .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (upErr) throw upErr;
          uploaded.push({ url: path, name: file.name, type: file.type || null, size: file.size });
        }
        const { error: msgErr } = await supabase.from("support_ticket_messages" as any).insert({
          ticket_id: ticket.id,
          sender_id: user!.id,
          is_staff: false,
          body: null,
          attachments: uploaded,
        });
        if (msgErr) throw msgErr;
      }

      toast.success(t("support.submitted"));
      setSubject("");
      setMessage("");
      setType("feedback");
      setPendingFiles([]);
      setView("submitted");
      queryClient.invalidateQueries({ queryKey: ["my_tickets"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = (s: string) => {
    switch (s) {
      case "open":
        return { color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: CircleDot, label: "Open" };
      case "in_progress":
        return { color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Clock, label: "In Progress" };
      case "resolved":
        return { color: "bg-green-500/15 text-green-600 border-green-500/30", icon: CheckCircle2, label: "Resolved" };
      default:
        return { color: "bg-muted text-muted-foreground border-border", icon: CircleDot, label: s };
    }
  };

  const openTicketDetail = async (ticket: any) => {
    setSelectedTicket(ticket);
    setView("detail");
    if (user) {
      await supabase
        .from("support_ticket_reads" as any)
        .upsert(
          { user_id: user.id, ticket_id: ticket.id, last_read_at: new Date().toISOString() },
          { onConflict: "user_id,ticket_id" }
        );
      queryClient.invalidateQueries({ queryKey: ["my_ticket_unread"] });
    }
  };

  // Header
  const renderHeader = () => {
    if (view === "detail") {
      return (
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
          <button onClick={() => setView("list")} className="p-1 rounded-full hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold truncate">Ticket Details</h2>
        </div>
      );
    }
    if (view === "form") {
      return (
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
          <button onClick={() => setView("list")} className="p-1 rounded-full hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">New Ticket</h2>
        </div>
      );
    }
    return (
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">{t("support.help_feedback")}</h2>
      </div>
    );
  };

  // Submitted confirmation view
  if (view === "submitted") {
    return (
      <div className="flex flex-col h-full">
        {renderHeader()}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h3 className="text-lg font-bold">{t("support.submitted")}</h3>
          <p className="text-sm text-muted-foreground">{t("support.submitted_desc")}</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="rounded-full" onClick={() => setView("list")}>
              View My Tickets
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setView("form")}>
              {t("support.submit_another")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ticket detail view
  if (view === "detail" && selectedTicket) {
    const sc = statusConfig(selectedTicket.status);
    const StatusIcon = sc.icon;
    return (
      <div className="flex flex-col h-full">
        {renderHeader()}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Ticket header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold leading-tight">{selectedTicket.subject}</h3>
                <Badge variant="outline" className={`flex-shrink-0 gap-1 text-xs ${sc.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {sc.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{selectedTicket.type}</span>
                <span>·</span>
                <span>{new Date(selectedTicket.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                <span>·</span>
                <span>{new Date(selectedTicket.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            <Separator />

            {/* Conversation thread */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Conversation
              </div>
              <SupportChatThread
                ticketId={selectedTicket.id}
                ticketStatus={selectedTicket.status}
                ticketUserId={selectedTicket.user_id}
                currentUserId={user!.id}
                isStaff={false}
                seedMessage={selectedTicket.message}
                seedCreatedAt={selectedTicket.created_at}
                legacyAdminNotes={selectedTicket.admin_notes}
              />
            </div>

            {/* Status timeline */}
            <Separator />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Status History</p>
              <div className="space-y-3 pl-1">
                <TimelineItem
                  label="Ticket submitted"
                  date={new Date(selectedTicket.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  active
                />
                {(selectedTicket.status === "in_progress" || selectedTicket.status === "resolved") && (
                  <TimelineItem
                    label="Under review by staff"
                    date={selectedTicket.admin_notes ? new Date(selectedTicket.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : undefined}
                    active
                  />
                )}
                {selectedTicket.status === "resolved" && (
                  <TimelineItem
                    label="Resolved"
                    date={new Date(selectedTicket.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    active
                    isLast
                  />
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // New ticket form view
  if (view === "form") {
    return (
      <div className="flex flex-col h-full">
        {renderHeader()}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("support.type")}</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{ticketTypes.map((tt) => <SelectItem key={tt.value} value={tt.value}>{tt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("support.subject")}</label>
              <Input placeholder={t("support.subject_placeholder")} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("support.message")}</label>
              <Textarea placeholder={t("support.message_placeholder")} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={5} className="rounded-xl resize-none" />
              <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt,.log,.csv,.zip"
                onChange={onPickFiles}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || pendingFiles.length >= MAX_FILES}
                className="w-full rounded-xl gap-2"
              >
                <Paperclip className="h-4 w-4" />
                {pendingFiles.length === 0 ? "Add files (screenshots, docs)" : "Add more"}
              </Button>
              {pendingFiles.length > 0 && (
                <div className="rounded-xl border border-border bg-secondary/40 p-2 space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} ·{" "}
                      {formatSize(pendingFiles.reduce((s, f) => s + f.size, 0))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {pendingFiles.map((f, idx) => (
                      <FilePreview key={idx} file={f} onRemove={() => removePending(idx)} formatSize={formatSize} />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Max {MAX_FILES} files, 10 MB each.</p>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-full gap-2">
              <Send className="h-4 w-4" />{submitting ? t("support.submitting") : t("support.submit")}
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Main list view
  return (
    <div className="flex flex-col h-full">
      {renderHeader()}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* New ticket CTA */}
          <Button onClick={() => setView("form")} className="w-full rounded-full gap-2">
            <Send className="h-4 w-4" /> Submit New Ticket
          </Button>

          {/* Tickets list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : myTickets.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No tickets yet. Submit one if you need help!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{t("support.your_tickets")}</h3>
              {myTickets.map((ticket: any) => {
                const sc = statusConfig(ticket.status);
                const StatusIcon = sc.icon;
                const hasResponse = !!ticket.admin_notes;
                const unread = (unreadByTicket as Record<string, number>)[ticket.id] || 0;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => openTicketDetail(ticket)}
                    className={`w-full text-left rounded-xl border p-3.5 space-y-2 transition-colors hover:bg-accent/50 active:bg-accent ${
                      unread > 0 ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold truncate flex-1">{ticket.subject}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {unread > 0 && (
                          <Badge className="h-5 min-w-5 px-1.5 text-[10px] rounded-full bg-primary text-primary-foreground hover:bg-primary">
                            {unread}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0.5 ${sc.color}`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {sc.label}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ticket.type} · {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticket.message}</p>
                    {unread > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {unread} new repl{unread === 1 ? "y" : "ies"} from staff
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      </div>
                    ) : hasResponse ? (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Staff responded · Tap to view
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                        <Clock className="h-3.5 w-3.5" />
                        {t("support.awaiting")}
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TimelineItem({ label, date, active, isLast }: { label: string; date?: string; active?: boolean; isLast?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${active ? "bg-primary" : "bg-muted-foreground/30"}`} />
        {!isLast && <div className="w-px h-6 bg-border mt-1" />}
      </div>
      <div>
        <p className={`text-sm ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {date && <p className="text-xs text-muted-foreground">{date}</p>}
      </div>
    </div>
  );
}

function FilePreview({ file, onRemove, formatSize }: { file: File; onRemove: () => void; formatSize: (n: number) => string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border bg-background group">
      {isImage && preview ? (
        <img src={preview} alt={file.name} className="h-20 w-full object-cover" />
      ) : (
        <div className="h-20 flex flex-col items-center justify-center gap-1 px-1 text-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground line-clamp-1 px-1">{file.name}</span>
        </div>
      )}
      <div className="px-1.5 py-1 text-[10px] text-muted-foreground bg-background/80 truncate">
        {formatSize(file.size)}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
