import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquareText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { timeAgo } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const statusIcons: Record<string, any> = {
  open: Clock,
  in_progress: MessageSquareText,
  resolved: CheckCircle2,
  closed: XCircle,
};

const statusColors: Record<string, string> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  closed: "outline",
};

export default function AdminSupport() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filter, setFilter] = useState("open");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin_tickets", filter],
    queryFn: async () => {
      let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(50);
      if (filter !== "all") query = query.eq("status", filter);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: ticketProfiles = {} } = useQuery({
    queryKey: ["admin_ticket_profiles", tickets],
    queryFn: async () => {
      const ids = [...new Set(tickets.map((t: any) => t.user_id))];
      if (ids.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: tickets.length > 0,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (notes !== undefined) update.admin_notes = notes;
      await supabase.from("support_tickets").update(update).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ["admin_tickets"] });
      setSelectedTicket(null);
    },
  });

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || "");
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Support Tickets</h2>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {["open", "in_progress", "resolved", "closed", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <MessageSquareText className="h-8 w-8 mb-2" />
            <p>No tickets</p>
          </div>
        ) : (
          tickets.map((t: any) => {
            const profile = (ticketProfiles as any)[t.user_id];
            const StatusIcon = statusIcons[t.status] || Clock;
            return (
              <button key={t.id} onClick={() => openTicket(t)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/30">
                <StatusIcon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{t.subject}</p>
                    <Badge variant={statusColors[t.status] as any} className="text-[10px] px-1.5 py-0">{t.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{profile?.username || "unknown"} · {t.type} · {timeAgo(t.created_at)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(v) => !v && setSelectedTicket(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes..." />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["in_progress", "resolved", "closed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateTicketMutation.mutate({ id: selectedTicket.id, status: s, notes: adminNotes })}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Mark as {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
