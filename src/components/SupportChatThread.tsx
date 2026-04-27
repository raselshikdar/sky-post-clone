import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  ticketId: string;
  ticketStatus: string;
  ticketUserId: string;
  currentUserId: string;
  isStaff: boolean;
  /** First user message (from support_tickets.message) shown as the seed */
  seedMessage?: string;
  seedCreatedAt?: string;
  /** Legacy admin_notes shown as a pinned staff response (optional) */
  legacyAdminNotes?: string | null;
}

export function SupportChatThread({
  ticketId,
  ticketStatus,
  ticketUserId,
  currentUserId,
  isStaff,
  seedMessage,
  seedCreatedAt,
  legacyAdminNotes,
}: Props) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["support_ticket_messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-msgs-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["support_ticket_messages", ticketId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, qc]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const closed = ticketStatus === "closed";

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("support_ticket_messages" as any).insert({
      ticket_id: ticketId,
      sender_id: currentUserId,
      body: text,
      is_staff: isStaff,
    });
    setSending(false);
    if (error) {
      toast.error(error.message || "Failed to send");
      return;
    }
    setBody("");
    qc.invalidateQueries({ queryKey: ["support_ticket_messages", ticketId] });
    qc.invalidateQueries({ queryKey: ["my_tickets"] });
    qc.invalidateQueries({ queryKey: ["admin_tickets"] });
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
        {/* Seed user message */}
        {seedMessage && (
          <Bubble
            mine={!isStaff && ticketUserId === currentUserId}
            staff={false}
            time={seedCreatedAt ? fmt(seedCreatedAt) : ""}
          >
            {seedMessage}
          </Bubble>
        )}

        {/* Legacy admin_notes (single response from old system) */}
        {legacyAdminNotes && (
          <Bubble mine={isStaff} staff time="">
            {legacyAdminNotes}
          </Bubble>
        )}

        {messages.map((m: any) => (
          <Bubble
            key={m.id}
            mine={m.sender_id === currentUserId}
            staff={m.is_staff}
            time={fmt(m.created_at)}
          >
            {m.body}
          </Bubble>
        ))}
        <div ref={scrollRef} />
      </div>

      {closed ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          This ticket is closed. Replies are disabled.
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isStaff ? "Reply to user…" : "Write a reply…"}
            rows={2}
            maxLength={2000}
            className="rounded-xl resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={sending || !body.trim()} className="rounded-full" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Bubble({
  mine,
  staff,
  time,
  children,
}: {
  mine: boolean;
  staff: boolean;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] space-y-1">
        {staff && !mine && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-primary px-1">
            <ShieldCheck className="h-3 w-3" />
            Staff
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
            mine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : staff
              ? "bg-primary/10 border border-primary/20 text-foreground rounded-bl-sm"
              : "bg-secondary text-foreground rounded-bl-sm"
          }`}
        >
          {children}
        </div>
        {time && (
          <div className={`text-[10px] text-muted-foreground px-1 ${mine ? "text-right" : "text-left"}`}>
            {time}
          </div>
        )}
      </div>
    </div>
  );
}
