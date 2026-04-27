import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ShieldCheck, Lock, Paperclip, X, FileText, Loader2, Download, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "support-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 6;

interface Attachment {
  url: string; // storage path
  name: string;
  type: string | null;
  size: number;
}

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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
        toast.error(`Maximum ${MAX_FILES} files per message`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    const text = body.trim();
    if (!text && pendingFiles.length === 0) return;
    setSending(true);
    try {
      const uploaded: Attachment[] = [];

      for (const file of pendingFiles) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${ticketId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (upErr) throw upErr;
        uploaded.push({
          url: path,
          name: file.name,
          type: file.type || null,
          size: file.size,
        });
      }

      const { error } = await supabase.from("support_ticket_messages" as any).insert({
        ticket_id: ticketId,
        sender_id: currentUserId,
        body: text || null,
        is_staff: isStaff,
        attachments: uploaded,
      });
      if (error) throw error;

      setBody("");
      setPendingFiles([]);
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

  // Normalize message attachments (combine new array + legacy single-attachment columns)
  const getAttachments = (m: any): Attachment[] => {
    const list: Attachment[] = Array.isArray(m.attachments) ? [...m.attachments] : [];
    if (m.attachment_url && !list.some((a) => a.url === m.attachment_url)) {
      list.push({
        url: m.attachment_url,
        name: m.attachment_name || "file",
        type: m.attachment_type || null,
        size: m.attachment_size || 0,
      });
    }
    return list;
  };

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

        {messages.map((m: any) => {
          const atts = getAttachments(m);
          return (
            <Bubble
              key={m.id}
              mine={m.sender_id === currentUserId}
              staff={m.is_staff}
              time={fmt(m.created_at)}
            >
              {atts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {atts.map((a, i) => (
                    <AttachmentView key={i} attachment={a} />
                  ))}
                </div>
              )}
              {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
            </Bubble>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {closed ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          This ticket is closed. Replies are disabled.
        </div>
      ) : (
        <div className="space-y-2">
          {pendingFiles.length > 0 && (
            <div className="rounded-xl border border-border bg-secondary/40 p-2 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {pendingFiles.length} attachment{pendingFiles.length === 1 ? "" : "s"} ·{" "}
                  {formatSize(pendingFiles.reduce((s, f) => s + f.size, 0))}
                </span>
                <button
                  onClick={() => setPendingFiles([])}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {pendingFiles.map((f, idx) => (
                  <PendingFileChip key={idx} file={f} onRemove={() => removePending(idx)} />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
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
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || pendingFiles.length >= MAX_FILES}
              aria-label="Attach files"
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
              disabled={sending || (!body.trim() && pendingFiles.length === 0)}
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

function PendingFileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
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
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = (attachment.type || "").startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.url, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.url]);

  if (isImage) {
    return (
      <a
        href={signedUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden bg-black/5 max-w-[260px]"
      >
        {signedUrl ? (
          <img src={signedUrl} alt={attachment.name} className="w-full h-auto max-h-64 object-cover" />
        ) : (
          <div className="h-32 w-[260px] flex items-center justify-center">
            <ImageIcon className="h-5 w-5 opacity-40" />
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
      <span className="truncate flex-1 font-medium">{attachment.name}</span>
      {attachment.size > 0 && <span className="opacity-70">{formatSize(attachment.size)}</span>}
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
