import { useState } from "react";
import { MoreHorizontal, Languages, Copy, BellOff, Bell, Filter, EyeOff, VolumeX, UserX, AlertTriangle, Pin, PinOff, Trash2, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";
import MuteWordsDialog from "@/components/MuteWordsDialog";
import InteractionSettings from "@/components/InteractionSettings";

interface PostCardMenuProps {
  postId: string;
  authorId: string;
  authorHandle: string;
  content: string;
  onHide: () => void;
}

export default function PostCardMenu({ postId, authorId, authorHandle, content, onHide }: PostCardMenuProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === authorId;
  const { t } = useTranslation();

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [muteWordsOpen, setMuteWordsOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);

  const { data: isPinned } = useQuery({
    queryKey: ["isPinned", postId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("pinned_posts").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle();
      return !!data;
    },
    enabled: !!user && isOwner,
  });

  // Check if thread is muted
  const { data: isThreadMuted } = useQuery({
    queryKey: ["isThreadMuted", postId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("muted_threads").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleTranslate = async (e: React.MouseEvent) => {
    stop(e);
    setMenuOpen(false);
    setTranslating(true);
    setTranslatedText("");
    setTimeout(() => setTranslateOpen(true), 150);

    try {
      // Detect user's browser language
      const browserLang = navigator.language.split("-")[0];
      const langMap: Record<string, string> = {
        en: "English", bn: "Bengali", es: "Spanish", fr: "French",
        hi: "Hindi", ar: "Arabic", zh: "Chinese", ja: "Japanese",
        de: "German", pt: "Portuguese", ko: "Korean", ru: "Russian",
        it: "Italian", tr: "Turkish", th: "Thai",
      };
      const targetLang = langMap[browserLang] || "English";

      const { data, error } = await supabase.functions.invoke("translate-post", {
        body: { content, targetLang },
      });

      if (error) throw error;
      setTranslatedText(data.translated || content);
    } catch {
      setTranslatedText(content);
      toast.error("Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    stop(e);
    navigator.clipboard.writeText(content);
    toast.success(t("menu.post_text_copied"));
  };

  const handleDelete = async (e: React.MouseEvent) => {
    stop(e);
    if (!user || !isOwner) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast.error("Failed to delete post"); return; }
    toast.success(t("menu.post_deleted"));
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const handlePin = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    await supabase.from("pinned_posts").delete().eq("user_id", user.id);
    const { error } = await supabase.from("pinned_posts").insert({ user_id: user.id, post_id: postId });
    if (error) { toast.error("Failed to pin post"); return; }
    toast.success(t("menu.post_pinned"));
    queryClient.invalidateQueries({ queryKey: ["pinnedPost"] });
    queryClient.invalidateQueries({ queryKey: ["isPinned"] });
  };

  const handleUnpin = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("pinned_posts").delete().eq("user_id", user.id).eq("post_id", postId);
    if (error) { toast.error("Failed to unpin post"); return; }
    toast.success("Post unpinned");
    queryClient.invalidateQueries({ queryKey: ["pinnedPost"] });
    queryClient.invalidateQueries({ queryKey: ["isPinned"] });
  };

  const handleToggleMuteThread = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;

    if (isThreadMuted) {
      // Unmute
      const { error } = await supabase.from("muted_threads").delete().eq("user_id", user.id).eq("post_id", postId);
      if (error) { toast.error("Failed to unmute thread"); return; }
      toast.success(t("menu.thread_unmuted"));
    } else {
      // Mute
      const { error } = await supabase.from("muted_threads").insert({ user_id: user.id, post_id: postId });
      if (error?.code === "23505") { toast.info(t("menu.thread_muted")); return; }
      if (error) { toast.error("Failed to mute thread"); return; }
      toast.success(t("menu.thread_muted"));
    }
    queryClient.invalidateQueries({ queryKey: ["isThreadMuted", postId] });
  };

  const handleMuteWords = (e: React.MouseEvent) => {
    stop(e);
    setMenuOpen(false);
    setTimeout(() => setMuteWordsOpen(true), 150);
  };

  const handleInteractionSettings = (e: React.MouseEvent) => {
    stop(e);
    setMenuOpen(false);
    setTimeout(() => setInteractionOpen(true), 150);
  };

  const handleHidePost = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId });
    if (error?.code === "23505") { toast.info(t("menu.post_hidden")); return; }
    if (error) { toast.error("Failed to hide post"); return; }
    onHide();
    toast(t("menu.post_hidden"), {
      action: {
        label: t("menu.undo"),
        onClick: async () => {
          await supabase.from("hidden_posts").delete().eq("user_id", user.id).eq("post_id", postId);
          queryClient.invalidateQueries({ queryKey: ["posts"] });
          toast.success(t("menu.post_unhidden"));
        },
      },
    });
  };

  const handleMuteAccount = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("muted_accounts").insert({ user_id: user.id, muted_user_id: authorId });
    if (error?.code === "23505") { toast.info("Account already muted"); return; }
    if (error) { toast.error("Failed to mute account"); return; }
    toast.success(`@${authorHandle} muted`);
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const handleBlockAccount = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("blocked_accounts").insert({ user_id: user.id, blocked_user_id: authorId });
    if (error?.code === "23505") { toast.info("Account already blocked"); return; }
    if (error) { toast.error("Failed to block account"); return; }
    toast.success(`@${authorHandle} blocked`);
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const handleReport = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, post_id: postId, reason: "spam" });
    if (error?.code === "23505") { toast.info("You already reported this post"); return; }
    if (error) { toast.error("Failed to report post"); return; }
    toast.success(t("menu.post_reported"));
  };

  const menuItem = (label: string, icon: React.ElementType, onClick: (e: React.MouseEvent) => void, destructive?: boolean) => {
    const Icon = icon;
    return (
      <DropdownMenuItem onClick={onClick} className={`flex items-center justify-between py-3 px-4 cursor-pointer ${destructive ? "text-destructive" : ""}`}>
        <span>{label}</span>
        <Icon className={`h-5 w-5 ${destructive ? "" : "text-muted-foreground"}`} />
      </DropdownMenuItem>
    );
  };

  const handleInteractionSave = () => {
    toast.success("Interaction settings saved");
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(prev => !prev); }}
            onPointerDown={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-50 bg-background border border-border shadow-lg">
          {isOwner ? (
            <>
              {isPinned
                ? menuItem("Unpin from profile", PinOff, handleUnpin)
                : menuItem(t("menu.pin_profile"), Pin, handlePin)
              }
              <DropdownMenuSeparator />
              {menuItem(t("menu.translate"), Languages, handleTranslate)}
              {menuItem(t("menu.copy_text"), Copy, handleCopy)}
              <DropdownMenuSeparator />
              {isThreadMuted
                ? menuItem(t("menu.unmute_thread"), Bell, handleToggleMuteThread)
                : menuItem(t("menu.mute_thread"), BellOff, handleToggleMuteThread)
              }
              {menuItem(t("menu.mute_words"), Filter, handleMuteWords)}
              <DropdownMenuSeparator />
              {menuItem("Edit interaction settings", Settings, handleInteractionSettings)}
              {menuItem(t("menu.delete_post"), Trash2, handleDelete, true)}
            </>
          ) : (
            <>
              {menuItem(t("menu.translate"), Languages, handleTranslate)}
              {menuItem(t("menu.copy_text"), Copy, handleCopy)}
              <DropdownMenuSeparator />
              {isThreadMuted
                ? menuItem(t("menu.unmute_thread"), Bell, handleToggleMuteThread)
                : menuItem(t("menu.mute_thread"), BellOff, handleToggleMuteThread)
              }
              {menuItem(t("menu.mute_words"), Filter, handleMuteWords)}
              <DropdownMenuSeparator />
              {menuItem(t("menu.hide_post"), EyeOff, handleHidePost)}
              <DropdownMenuSeparator />
              {menuItem(t("menu.mute_account"), VolumeX, handleMuteAccount)}
              {menuItem(t("menu.block_account"), UserX, handleBlockAccount)}
              {menuItem(t("menu.report_post"), AlertTriangle, handleReport)}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Translate Dialog */}
      <Dialog open={translateOpen} onOpenChange={setTranslateOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("menu.translate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase">{t("menu.original_text")}</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
            <div className="border-t border-border" />
            <div className="text-xs font-medium text-muted-foreground uppercase">{t("menu.translated_text")}</div>
            {translating ? (
              <p className="text-sm text-muted-foreground animate-pulse">{t("menu.translating")}...</p>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">{translatedText}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MuteWordsDialog open={muteWordsOpen} onOpenChange={setMuteWordsOpen} />
      <InteractionSettings
        open={interactionOpen}
        onOpenChange={setInteractionOpen}
        postId={postId}
        onSave={handleInteractionSave}
      />
    </>
  );
}
