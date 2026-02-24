import { useState } from "react";
import { Check, CheckCheck, Reply } from "lucide-react";

const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

interface Reaction {
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  imageUrl?: string | null;
  isMine: boolean;
  time: string;
  delivered: boolean;
  read: boolean;
  replyTo?: { content: string; senderName: string } | null;
  reactions: Reaction[];
  onReact: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
}

export default function MessageBubble({
  id, content, imageUrl, isMine, time, delivered, read,
  replyTo, reactions, onReact, onReply
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);

  const tickIcon = read
    ? <CheckCheck className="h-3.5 w-3.5 text-[hsl(var(--bsky-blue))]" />
    : delivered
    ? <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/50" />
    : <Check className="h-3.5 w-3.5 text-primary-foreground/50" />;

  return (
    <div className={`flex flex-col mb-1 ${isMine ? "items-end" : "items-start"}`}>
      {/* Reply reference */}
      {replyTo && (
        <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs border-l-2 border-primary/50 mb-0.5 ${
          isMine ? "bg-primary/10" : "bg-muted/80"
        }`}>
          <span className="font-semibold text-primary text-[10px]">{replyTo.senderName}</span>
          <p className="truncate text-muted-foreground">{replyTo.content}</p>
        </div>
      )}

      {/* Bubble */}
      <div
        className="relative group max-w-[80%]"
        onDoubleClick={() => setShowReactions(!showReactions)}
      >
        {/* Hover actions */}
        <div className={`absolute top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
          isMine ? "right-full mr-1" : "left-full ml-1"
        }`}>
          <button onClick={() => onReply(id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-accent text-muted-foreground transition-colors">
            <Reply className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowReactions(!showReactions)} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-accent text-muted-foreground transition-colors text-xs">
            😊
          </button>
        </div>

        <div className={`rounded-2xl overflow-hidden ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}>
          {imageUrl && (
            <img src={imageUrl} alt="Shared" className="w-full max-h-64 object-cover cursor-pointer" onClick={() => window.open(imageUrl, "_blank")} />
          )}

          {/* Content with inline timestamp — WhatsApp style */}
          <div className="px-3 py-1.5">
            {content ? (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed inline">{content}
                {/* Invisible spacer so time doesn't overlap text */}
                <span className="inline-block w-[70px]" />
              </p>
            ) : null}

            {/* Floating time + ticks at bottom-right */}
            <span className={`float-right flex items-center gap-0.5 mt-1 ml-2 ${
              !content && imageUrl ? "pt-0.5" : "-mb-0.5"
            }`}>
              <span className={`text-[10px] leading-none ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {time}
              </span>
              {isMine && tickIcon}
            </span>

            {/* Clear float */}
            <div className="clear-both" />
          </div>
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowReactions(false)} />
            <div className={`absolute z-50 bottom-full mb-1 flex gap-0.5 rounded-full bg-background border border-border shadow-lg px-1.5 py-1 animate-scale-in ${
              isMine ? "right-0" : "left-0"
            }`}>
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => { onReact(id, emoji); setShowReactions(false); }}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-lg">
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reactions */}
      {reactions.length > 0 && (
        <div className={`flex gap-1 mt-0.5 ${isMine ? "pr-2" : "pl-2"}`}>
          {reactions.map((r) => (
            <button key={r.emoji} onClick={() => onReact(id, r.emoji)}
              className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors ${
                r.myReaction ? "border-primary/40 bg-primary/10" : "border-border bg-muted hover:bg-accent"
              }`}>
              <span>{r.emoji}</span>
              {r.count > 1 && <span className="text-muted-foreground">{r.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
