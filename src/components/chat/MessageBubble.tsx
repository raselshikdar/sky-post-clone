import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  imageUrl?: string | null;
  isMine: boolean;
  time: string;
  delivered: boolean;
  read: boolean;
}

export default function MessageBubble({ content, imageUrl, isMine, time, delivered, read }: MessageBubbleProps) {
  return (
    <div className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl text-[15px] overflow-hidden ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Shared image"
            className="w-full max-h-64 object-cover cursor-pointer"
            onClick={() => window.open(imageUrl, "_blank")}
          />
        )}
        {content && (
          <p className="whitespace-pre-wrap break-words px-3.5 py-2">{content}</p>
        )}
        <div className={`flex items-center gap-1 px-3.5 pb-1.5 ${!content && imageUrl ? "pt-1" : "-mt-1"} ${isMine ? "justify-end" : ""}`}>
          <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {time}
          </span>
          {isMine && (
            <span className="flex items-center">
              {read ? (
                <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
              ) : delivered ? (
                <CheckCheck className={`h-3.5 w-3.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`} />
              ) : (
                <Check className={`h-3.5 w-3.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
