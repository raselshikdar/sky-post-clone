import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon, Globe, ChevronDown, Video, Loader2, Link2 } from "lucide-react";
import { convertToWebP } from "@/lib/imageUtils";
import { processVideo, uploadVideo } from "@/lib/videoUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import InteractionSettings from "@/components/InteractionSettings";
import { timeAgo } from "@/lib/time";
import RichContent from "@/components/RichContent";
import { useTranslation } from "@/i18n/LanguageContext";
import { Progress } from "@/components/ui/progress";
import EmbedPlayer, { isEmbeddableUrl, getEmbedInfo } from "@/components/EmbedPlayer";
import GifPicker from "@/components/GifPicker";

interface QuotePostData {
  id: string; content: string; authorName: string; authorHandle: string;
  authorAvatar: string; createdAt: string; images?: string[];
}

interface ComposerProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  parentId?: string; autoOpenImagePicker?: boolean; quotePost?: QuotePostData;
}

const MAX_CHARS = 300;

export default function Composer({ open, onOpenChange, parentId, autoOpenImagePicker, quotePost }: ComposerProps) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionLabel, setInteractionLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProcessStage, setVideoProcessStage] = useState("");
  const [videoProcessProgress, setVideoProcessProgress] = useState(0);

  // Embed state
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedInputOpen, setEmbedInputOpen] = useState(false);
  const [confirmedEmbedUrl, setConfirmedEmbedUrl] = useState<string | null>(null);

  // GIF state
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);

  const hasVideo = !!videoFile;
  const hasImages = images.length > 0;
  const hasEmbed = !!confirmedEmbedUrl;
  const hasGif = !!selectedGif;

  // Set default interaction label
  useEffect(() => {
    setInteractionLabel(t("composer.anyone_interact"));
  }, [t]);

  const remaining = MAX_CHARS - content.length;
  const overLimit = remaining < 0;
  const progress = Math.min(content.length / MAX_CHARS, 1);

  useEffect(() => {
    if (open && autoOpenImagePicker) {
      const timer = setTimeout(() => fileInputRef.current?.click(), 300);
      return () => clearTimeout(timer);
    }
  }, [open, autoOpenImagePicker]);

  const canPost = (content.trim().length > 0 || images.length > 0 || hasVideo || hasEmbed || hasGif) && !overLimit && !videoProcessing;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 4) { toast.error(t("composer.max_images")); return; }
    try {
      const converted = await Promise.all(files.map((f) => convertToWebP(f)));
      const newImages = converted.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setImages((prev) => [...prev, ...newImages]);
    } catch { toast.error(t("composer.failed_image")); }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    setVideoProcessing(true);
    setVideoProcessStage("Checking video...");
    setVideoProcessProgress(0);

    try {
      const result = await processVideo(file, (stage, prog) => {
        setVideoProcessStage(stage);
        setVideoProcessProgress(prog * 100);
      });
      setVideoFile(result.file);
      setVideoPreview(URL.createObjectURL(result.file));
    } catch (err: any) {
      toast.error(err.message || "Failed to process video");
    } finally {
      setVideoProcessing(false);
      setVideoProcessStage("");
      setVideoProcessProgress(0);
    }
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleAddEmbed = () => {
    const trimmed = embedUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed); // validate URL
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    const info = getEmbedInfo(trimmed);
    if (!info) {
      toast.error("This URL is not supported for embedding. Try YouTube, Facebook, Twitch, Vimeo, VDO.Ninja, Kick, Rumble, Dailymotion, or Streamable.");
      return;
    }
    setConfirmedEmbedUrl(trimmed);
    setEmbedInputOpen(false);
    setEmbedUrl("");
  };

  const removeEmbed = () => {
    setConfirmedEmbedUrl(null);
  };

  const uploadImage = async (file: File, postId: string, position: number) => {
    const path = `${user!.id}/${postId}/${position}.webp`;
    const { error } = await supabase.storage.from("profiles").upload(path, file, { contentType: "image/webp" });
    if (error) throw error;
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePost = async () => {
    if (!user || !canPost) return;
    setPosting(true);
    try {
      // Upload video first if present
      let videoUrl: string | null = null;
      if (videoFile) {
        setVideoProcessStage("Uploading video...");
        setVideoProcessProgress(0);
        setVideoProcessing(true);
        try {
          videoUrl = await uploadVideo(videoFile, (prog) => {
            setVideoProcessProgress(prog * 100);
          });
        } finally {
          setVideoProcessing(false);
          setVideoProcessStage("");
          setVideoProcessProgress(0);
        }
      }

      const insertData: any = {
        author_id: user.id, content: content.trim(), parent_id: parentId || null, quote_post_id: quotePost?.id || null,
      };
      if (videoUrl) insertData.video_url = videoUrl;
      if (confirmedEmbedUrl) insertData.embed_url = confirmedEmbedUrl;

      const { data: post, error } = await supabase.from("posts").insert(insertData).select("id").single();
      if (error || !post) { toast.error(t("composer.failed_post")); return; }
      if (images.length > 0) {
        const urls = await Promise.all(images.map((img, i) => uploadImage(img.file, post.id, i)));
        const imageRows = urls.map((url, i) => ({ post_id: post.id, url, position: i }));
        await supabase.from("post_images").insert(imageRows);
      }
      // Store selected GIF as a post image (external URL, no upload needed)
      if (selectedGif) {
        await supabase.from("post_images").insert([{ post_id: post.id, url: selectedGif, position: 0 }]);
      }
      if (parentId) {
        const { data: parentPost } = await supabase.from("posts").select("author_id").eq("id", parentId).single();
        if (parentPost && parentPost.author_id !== user.id) {
          await supabase.from("notifications").insert({ user_id: parentPost.author_id, actor_id: user.id, type: "reply", post_id: parentId });
        }
      }
      if (quotePost) {
        const { data: quotedPost } = await supabase.from("posts").select("author_id").eq("id", quotePost.id).single();
        if (quotedPost && quotedPost.author_id !== user.id) {
          await supabase.from("notifications").insert({ user_id: quotedPost.author_id, actor_id: user.id, type: "quote", post_id: post.id });
        }
      }
      const mentionRegex = /@([\w\u0980-\u09FF]+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1]);
      if (mentions.length > 0) {
        const { data: mentionedUsers } = await supabase.from("profiles").select("id, username").in("username", mentions);
        if (mentionedUsers) {
          const mentionNotifs = mentionedUsers.filter(u => u.id !== user.id).map(u => ({
            user_id: u.id, actor_id: user.id, type: "mention" as const, post_id: post.id,
          }));
          if (mentionNotifs.length > 0) await supabase.from("notifications").insert(mentionNotifs);
        }
      }
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setContent(""); setImages([]); setVideoFile(null); setVideoPreview(null); setConfirmedEmbedUrl(null); setEmbedUrl(""); setEmbedInputOpen(false); setSelectedGif(null);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profilePosts"] });
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message || "Failed to post"); }
    finally { setPosting(false); }
  };

  const handleClose = () => {
    if (videoProcessing) return; // Don't close while processing
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setContent(""); setImages([]); setVideoFile(null); setVideoPreview(null); setConfirmedEmbedUrl(null); setEmbedUrl(""); setEmbedInputOpen(false); setSelectedGif(null); onOpenChange(false);
  };

  const ringRadius = 10;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg gap-0 p-0 [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={handleClose} disabled={videoProcessing} className="text-sm font-semibold text-primary">{t("composer.cancel")}</button>
            <div className="flex items-center gap-3">
              <button className="text-sm font-semibold text-primary">{t("composer.drafts")}</button>
              <button onClick={handlePost} disabled={!canPost || posting || videoProcessing}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors ${canPost && !videoProcessing ? "bg-primary hover:bg-primary/90" : "bg-primary/40"}`}>
                {posting ? t("composer.posting") : parentId ? t("composer.reply") : t("composer.post")}
              </button>
            </div>
          </div>
          <div className="flex gap-3 px-4 pb-2">
            <Avatar className="h-11 w-11 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <textarea className="min-h-[120px] w-full resize-none bg-transparent text-[17px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
                placeholder={quotePost ? t("composer.add_comment") : parentId ? t("composer.write_reply") : t("home.whats_up")}
                value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
              {images.length > 0 && (
                <div className={`grid gap-1 mt-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {images.map((img, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-border">
                      <img src={img.preview} alt="" className="w-full object-cover aspect-square" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Video processing indicator */}
              {videoProcessing && (
                <div className="mt-2 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>{videoProcessStage}</span>
                  </div>
                  <Progress value={videoProcessProgress} className="h-2" />
                  <p className="text-[11px] text-muted-foreground mt-1.5">Max duration: 2 minutes · Resolution: 480p</p>
                </div>
              )}

              {/* Video preview */}
              {videoPreview && !videoProcessing && (
                <div className="mt-2 relative rounded-xl overflow-hidden border border-border">
                  <video src={videoPreview} controls playsInline preload="metadata" className="w-full max-h-[300px]" />
                  <button onClick={removeVideo}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Embed URL input */}
              {embedInputOpen && !confirmedEmbedUrl && (
                <div className="mt-2 rounded-xl border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Paste a video URL from YouTube, Facebook, Twitch, Vimeo, VDO.Ninja, Kick, Rumble, Dailymotion, or Streamable</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={embedUrl}
                      onChange={(e) => setEmbedUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEmbed(); } }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                    <button onClick={handleAddEmbed} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                      Add
                    </button>
                    <button onClick={() => { setEmbedInputOpen(false); setEmbedUrl(""); }} className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Embed preview */}
              {confirmedEmbedUrl && (
                <div className="mt-2 relative">
                  <EmbedPlayer url={confirmedEmbedUrl} />
                  <button onClick={removeEmbed}
                    className="absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
               )}

              {/* GIF preview */}
              {selectedGif && (
                <div className="mt-2 relative rounded-xl overflow-hidden border border-border">
                  <img src={selectedGif} alt="Selected GIF" className="w-full max-h-[300px] object-contain bg-muted" />
                  <button onClick={() => setSelectedGif(null)}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {quotePost && (
                <div className="mt-2 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Avatar className="h-5 w-5"><AvatarImage src={quotePost.authorAvatar} /><AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{quotePost.authorName[0]?.toUpperCase()}</AvatarFallback></Avatar>
                    <span className="font-semibold text-foreground truncate">{quotePost.authorName}</span>
                    <span className="text-muted-foreground truncate">@{quotePost.authorHandle}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground flex-shrink-0">{timeAgo(quotePost.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground line-clamp-3"><RichContent content={quotePost.content} /></p>
                </div>
              )}
            </div>
          </div>
          <div className="px-4 pb-3">
            <button onClick={() => setInteractionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors">
              <Globe className="h-4 w-4" /><span>{interactionLabel}</span><ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button onClick={() => fileInputRef.current?.click()}
                className={`rounded-full p-2 transition-colors ${hasVideo ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"}`}
                disabled={images.length >= 4 || hasVideo}>
                <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className={`rounded-full p-2 transition-colors ${hasImages || hasVideo || videoProcessing ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"}`}
                disabled={hasImages || hasVideo || videoProcessing}
                title="Upload video (max 2 min)"
              >
                <Video className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setEmbedInputOpen(!embedInputOpen)}
                className={`rounded-full p-2 transition-colors ${hasVideo || hasEmbed ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"}`}
                disabled={hasVideo || hasEmbed}
                title="Embed video link"
              >
                <Link2 className="h-5 w-5" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setGifPickerOpen(true)}
                className={`rounded-full p-2 transition-colors ${hasVideo || hasImages || hasGif ? "text-muted-foreground/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"}`}
                disabled={hasVideo || hasImages || hasGif}
              >
                <span className="text-xs font-bold border-2 border-primary rounded px-1">GIF</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp,image/tiff" multiple className="hidden" onChange={handleImageSelect} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${overLimit ? "text-destructive" : remaining <= 20 ? "text-orange-500" : "text-muted-foreground"}`}>{remaining}</span>
              <svg width="26" height="26" className="-rotate-90">
                <circle cx="13" cy="13" r={ringRadius} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                <circle cx="13" cy="13" r={ringRadius} fill="none"
                  stroke={overLimit ? "hsl(var(--destructive))" : remaining <= 20 ? "orange" : "hsl(var(--primary))"}
                  strokeWidth="2.5" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <InteractionSettings open={interactionOpen} onOpenChange={setInteractionOpen} onSave={(label) => setInteractionLabel(label)} />
      <GifPicker open={gifPickerOpen} onOpenChange={setGifPickerOpen} onSelect={(url) => setSelectedGif(url)} />
    </>
  );
}
