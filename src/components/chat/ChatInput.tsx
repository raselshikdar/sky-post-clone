import { useState, useRef } from "react";
import { Send, Smile, Image, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string, imageFile?: File) => void;
  sending: boolean;
}

const MAX_IMAGE_SIZE = 500 * 1024; // 500KB

export default function ChatInput({ onSend, sending }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!message.trim() && !imageFile) || sending) return;
    onSend(message.trim(), imageFile || undefined);
    setMessage("");
    setImagePreview(null);
    setImageFile(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be under 500KB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const hasContent = message.trim() || imageFile;

  return (
    <div className="border-t border-border bg-background px-3 py-2.5 relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
          <div className="relative z-50">
            <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
          </div>
        </>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-border object-cover" />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {/* Emoji button */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Image button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Image className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          className="flex-1 rounded-full border border-border bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!hasContent || sending}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
