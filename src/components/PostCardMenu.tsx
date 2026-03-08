import { useState } from "react";
import { MoreHorizontal, Languages, Copy, BellOff, Filter, EyeOff, VolumeX, UserX, AlertTriangle, Pin, Settings, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/LanguageContext";

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
  const navigate = useNavigate();
  const isOwner = user?.id === authorId;
  const { t } = useTranslation();

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCopy = (e: React.MouseEvent) => { stop(e); navigator.clipboard.writeText(content); toast.success(t("menu.post_text_copied")); };
  const handleDelete = async (e: React.MouseEvent) => {
    stop(e); if (!user || !isOwner) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast.error("Failed to delete post"); return; }
    toast.success(t("menu.post_deleted")); queryClient.invalidateQueries({ queryKey: ["posts"] });
  };
  const handlePin = async (e: React.MouseEvent) => {
    stop(e); if (!user) return;
    await supabase.from("pinned_posts").delete().eq("user_id", user.id);
    const { error } = await supabase.from("pinned_posts").insert({ user_id: user.id, post_id: postId });
    if (error) { toast.error("Failed to pin post"); return; }
    toast.success(t("menu.post_pinned"));
  };
  const handleMuteThread = async (e: React.MouseEvent) => {
    stop(e); if (!user) return;
    const { error } = await supabase.from("muted_threads").insert({ user_id: user.id, post_id: postId });
    if (error?.code === "23505") { toast.info(t("menu.thread_muted")); return; }
    if (error) { toast.error("Failed to mute thread"); return; }
    toast.success(t("menu.thread_muted"));
  };
  const handleHidePost = async (e: React.MouseEvent) => {
    stop(e); if (!user) return;
    const { error } = await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId });
    if (error?.code === "23505") { toast.info(t("menu.post_hidden")); return; }
    if (error) { toast.error("Failed to hide post"); return; }
    toast.success(t("menu.post_hidden")); onHide();
  };
  const handleMuteAccount = async (e: React.MouseEvent) => {
    stop(e); if (!user) return;
    const { error } = await supabase.from("muted_accounts").insert({ user_id: user.id, muted_user_id: authorId });
    if (error?.code === "23505") { toast.info("Account already muted"); return; }
    if (error) { toast.error("Failed to mute account"); return; }
    toast.success(`@${authorHandle} muted`); queryClient.invalidateQueries({ queryKey: ["posts"] });
  };
  const handleBlockAccount = async (e: React.MouseEvent) => {
    stop(e); if (!user) return;
    const { error } = await supabase.from("blocked_accounts").insert({ user_id: user.id, blocked_user_id: authorId });
    if (error?.code === "23505") { toast.info("Account already blocked"); return; }
    if (error) { toast.error("Failed to block account"); return; }
    toast.success(`@${authorHandle} blocked`); queryClient.invalidateQueries({ queryKey: ["posts"] });
  };
  const handleReport = async (e: React.MouseEvent) => {
    stop(e); if (!user) return;
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

  return (
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
            {menuItem(t("menu.pin_profile"), Pin, handlePin)}
            {menuItem(t("menu.copy_text"), Copy, handleCopy)}
            <DropdownMenuSeparator />
            {menuItem(t("menu.mute_thread"), BellOff, handleMuteThread)}
            <DropdownMenuSeparator />
            {menuItem(t("menu.delete_post"), Trash2, handleDelete, true)}
          </>
        ) : (
          <>
            {menuItem(t("menu.copy_text"), Copy, handleCopy)}
            <DropdownMenuSeparator />
            {menuItem(t("menu.mute_thread"), BellOff, handleMuteThread)}
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
  );
}
