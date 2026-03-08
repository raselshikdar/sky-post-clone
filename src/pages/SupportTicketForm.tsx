import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Send, CheckCircle2, ArrowLeft, MessageSquare, Clock, ShieldCheck, CircleDot, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";

type ViewMode = "list" | "form" | "detail" | "submitted";

export default function SupportTicketForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user!.id,
      type,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit ticket");
    } else {
      toast.success(t("support.submitted"));
      setSubject("");
      setMessage("");
      setType("feedback");
      setView("submitted");
      queryClient.invalidateQueries({ queryKey: ["my_tickets"] });
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

  const openTicketDetail = (ticket: any) => {
    setSelectedTicket(ticket);
    setView("detail");
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

            {/* User's original message */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Your Message
              </div>
              <div className="rounded-xl bg-secondary/70 p-3.5">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
              </div>
            </div>

            <Separator />

            {/* Admin/Moderator response */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Staff Response
              </div>
              {selectedTicket.admin_notes ? (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin / Moderator
                    {selectedTicket.updated_at && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {new Date(selectedTicket.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedTicket.admin_notes}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 flex flex-col items-center gap-2 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("support.awaiting")}</p>
                  <p className="text-xs text-muted-foreground">You'll see the response here once a staff member reviews your ticket.</p>
                </div>
              )}
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
                return (
                  <button
                    key={ticket.id}
                    onClick={() => openTicketDetail(ticket)}
                    className="w-full text-left rounded-xl border border-border p-3.5 space-y-2 transition-colors hover:bg-accent/50 active:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold truncate flex-1">{ticket.subject}</p>
                      <Badge variant="outline" className={`flex-shrink-0 gap-1 text-[10px] px-1.5 py-0.5 ${sc.color}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {sc.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ticket.type} · {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticket.message}</p>
                    {hasResponse ? (
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
