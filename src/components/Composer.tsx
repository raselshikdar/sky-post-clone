import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon, Globe, ChevronDown } from "lucide-react";
import { convertToWebP } from "@/lib/imageUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import InteractionSettings from "@/components/InteractionSettings";

interface ComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
  autoOpenImagePicker?: boolean;
}

const MAX_CHARS = 300;

export default function Composer({ open, onOpenChange, parentId, autoOpenImagePicker }: ComposerProps) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionLabel, setInteractionLabel] = useState("Anyone can interact");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const remaining = MAX_CHARS - content.length;
  const overLimit = remaining < 0;
  const progress = Math.min(content.length / MAX_CHARS, 1);
  useEffect(() => {
    if (open && autoOpenImagePicker) {
      const timer = setTimeout(() => fileInputRef.current?.click(), 300);
      return () => clearTimeout(timer);
    }
  }, [open, autoOpenImagePicker]);

  const canPost = (content.trim().length > 0 || images.length > 0) && !overLimit;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }
    try {
      const converted = await Promise.all(files.map((f) => convertToWebP(f)));
      const newImages = converted.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setImages((prev) => [...prev, ...newImages]);
    } catch {
      toast.error("Failed to process image");
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImage = async (file: File, postId: string, position: number) => {
    const path = `${user!.id}/${postId}/${position}.webp`;
    const { error } = await supabase.storage.from("profiles").upload(path, file, {
      contentType: "image/webp",
    });
    if (error) throw error;
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePost = async () => {
    if (!user || !canPost) return;
    setPosting(true);
    try {
      const { data: post, error } = await supabase.from("posts").insert({
        author_id: user.id,
        content: content.trim(),
        parent_id: parentId || null,
      }).select("id").single();

      if (error || !post) { toast.error("Failed to create post"); return; }

      // Upload images
      if (images.length > 0) {
        const urls = await Promise.all(images.map((img, i) => uploadImage(img.file, post.id, i)));
        const imageRows = urls.map((url, i) => ({ post_id: post.id, url, position: i }));
        await supabase.from("post_images").insert(imageRows);
      }

      // Cleanup
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setContent("");
      setImages([]);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profilePosts"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    if (content.trim() || images.length > 0) {
      // Could save draft here
    }
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setContent("");
    setImages([]);
    onOpenChange(false);
  };

  // SVG ring for character count
  const ringRadius = 10;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg gap-0 p-0 [&>button]:hidden">
          {/* Header: Cancel / Drafts / Post */}
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={handleClose} className="text-sm font-semibold text-primary">
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button className="text-sm font-semibold text-primary">Drafts</button>
              <button
                onClick={handlePost}
                disabled={!canPost || posting}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors ${
                  canPost ? "bg-primary hover:bg-primary/90" : "bg-primary/40"
                }`}
              >
                {posting ? "Posting..." : parentId ? "Reply" : "Post"}
              </button>
            </div>
          </div>

          {/* Compose area */}
          <div className="flex gap-3 px-4 pb-2">
            <Avatar className="h-11 w-11 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {profile?.display_name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <textarea
                className="min-h-[150px] w-full resize-none bg-transparent text-[17px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
                placeholder={parentId ? "Write your reply" : "What's up?"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />

              {/* Image previews */}
              {images.length > 0 && (
                <div className={`grid gap-1 mt-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {images.map((img, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-border">
                      <img src={img.preview} alt="" className="w-full object-cover aspect-square" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interaction setting chip */}
          <div className="px-4 pb-3">
            <button
              onClick={() => setInteractionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>{interactionLabel}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full p-2 text-primary transition-colors hover:bg-primary/10"
                disabled={images.length >= 4}
              >
                <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <button className="rounded-full p-2 text-primary transition-colors hover:bg-primary/10">
                <span className="text-xs font-bold border-2 border-primary rounded px-1">GIF</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp,image/tiff"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">English</span>
              <span className={`text-sm font-medium ${overLimit ? "text-destructive" : remaining <= 20 ? "text-orange-500" : "text-muted-foreground"}`}>
                {remaining}
              </span>
              {/* Character ring */}
              <svg width="26" height="26" className="-rotate-90">
                <circle cx="13" cy="13" r={ringRadius} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                <circle
                  cx="13" cy="13" r={ringRadius} fill="none"
                  stroke={overLimit ? "hsl(var(--destructive))" : remaining <= 20 ? "orange" : "hsl(var(--primary))"}
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InteractionSettings
        open={interactionOpen}
        onOpenChange={setInteractionOpen}
        onSave={(label) => setInteractionLabel(label)}
      />
    </>
  );
}
