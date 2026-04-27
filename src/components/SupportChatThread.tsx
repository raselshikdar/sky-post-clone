import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShieldCheck, Lock, Paperclip, X, FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "support-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface Props {
  ticketId: string;
  ticketStatus: string;
  ticketUserId: string;
  currentUserId: string;
  isStaff: boolean;
  seedMessage?: string;
  seedCreatedAt?: string;
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const channel = supabase
      .channel(`ticket-msgs-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => qc.invalidateQueries({ queryKey: ["support_ticket_messages", ticketId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const closed = ticketStatus === "closed";

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File too large (max 10 MB)");
      return;
    }
    setPendingFile(f);
  };

  const send = async () => {
    const text = body.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;
      let attachmentSize: number | null = null;

      if (pendingFile) {
        const safeName = pendingFile.name.replace(/[^\w.\-]+/g, "_");
        const path = `${ticketId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, pendingFile, {
          contentType: pendingFile.type || "application/octet-stream",
          upsert: false,
        });
        if (upErr) throw upErr;
        attachmentUrl = path;
        attachmentName = pendingFile.name;
        attachmentType = pendingFile.type || null;
        attachmentSize = pendingFile.size;
      }

      const { error } = await supabase.from("support_ticket_messages" as any).insert({
        ticket_id: ticketId,
        sender_id: currentUserId,
        body: text || null,
        is_staff: isStaff,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        attachment_size: attachmentSize,
      });
      if (error) throw error;

      setBody("");
      setPendingFile(null);
      qc.invalidateQueries({ queryKey: ["support_ticket_messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["my_tickets"] });
      qc.invalidateQueries({ queryKey: ["admin_tickets"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
        {seedMessage && (
          <Bubble
            mine={!isStaff && ticketUserId === currentUserId}
            staff={false}
            time={seedCreatedAt ? fmt(seedCreatedAt) : ""}
          >
            <p className="whitespace-pre-wrap">{seedMessage}</p>
          </Bubble>
        )}

        {legacyAdminNotes && (
          <Bubble mine={isStaff} staff time="">
            <p className="whitespace-pre-wrap">{legacyAdminNotes}</p>
          </Bubble>
        )}

        {messages.map((m: any) => (
          <Bubble
            key={m.id}
            mine={m.sender_id === currentUserId}
            staff={m.is_staff}
            time={fmt(m.created_at)}
          >
            {m.attachment_url && (
              <AttachmentView
                path={m.attachment_url}
                name={m.attachment_name}
                type={m.attachment_type}
                size={m.attachment_size}
              />
            )}
            {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
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
        <div className="space-y-2">
          {pendingFile && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-xs">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1">{pendingFile.name}</span>
              <span className="text-muted-foreground">{formatSize(pendingFile.size)}</span>
              <button
                onClick={() => setPendingFile(null)}
                className="p-0.5 rounded hover:bg-accent"
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*,application/pdf,.doc,.docx,.txt,.log,.csv,.zip"
              onChange={onPickFile}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
            <Button
              onClick={send}
              disabled={sending || (!body.trim() && !pendingFile)}
              className="rounded-full"
              size="icon"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AttachmentView({
  path,
  name,
  type,
  size,
}: {
  path: string;
  name: string | null;
  type: string | null;
  size: number | null;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = (type || "").startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (isImage) {
    return (
      <a
        href={signedUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden bg-black/5 max-w-[260px]"
      >
        {signedUrl ? (
          <img src={signedUrl} alt={name || "attachment"} className="w-full h-auto max-h-64 object-cover" />
        ) : (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin opacity-60" />
          </div>
        )}
      </a>
    );
  }

  return (
    <a
      href={signedUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg bg-background/30 border border-current/10 px-2.5 py-2 text-xs hover:opacity-90 max-w-[260px]"
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <span className="truncate flex-1 font-medium">{name || "Attachment"}</span>
      {size != null && <span className="opacity-70">{formatSize(size)}</span>}
      <Download className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
    </a>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed space-y-2 ${
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
