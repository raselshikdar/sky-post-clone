import { MoreHorizontal, Languages, Copy, BellOff, Filter, EyeOff, VolumeX, UserX, AlertTriangle, Pin, Settings, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleCopy = (e: React.MouseEvent) => {
    stop(e);
    navigator.clipboard.writeText(content);
    toast.success("Post text copied");
  };

  const handleDelete = async (e: React.MouseEvent) => {
    stop(e);
    if (!user || !isOwner) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast.error("Failed to delete post"); return; }
    toast.success("Post deleted");
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const handlePin = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    // Remove existing pin, then set new one
    await supabase.from("pinned_posts").delete().eq("user_id", user.id);
    const { error } = await supabase.from("pinned_posts").insert({ user_id: user.id, post_id: postId });
    if (error) { toast.error("Failed to pin post"); return; }
    toast.success("Post pinned to your profile");
  };

  const handleMuteThread = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("muted_threads").insert({ user_id: user.id, post_id: postId });
    if (error?.code === "23505") { toast.info("Thread already muted"); return; }
    if (error) { toast.error("Failed to mute thread"); return; }
    toast.success("Thread muted");
  };

  const handleHidePost = async (e: React.MouseEvent) => {
    stop(e);
    if (!user) return;
    const { error } = await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId });
    if (error?.code === "23505") { toast.info("Post already hidden"); return; }
    if (error) { toast.error("Failed to hide post"); return; }
    toast.success("Post hidden");
    onHide();
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
    toast.success("Post reported. Thank you.");
  };

  const menuItem = (label: string, icon: React.ElementType, onClick: (e: React.MouseEvent) => void, destructive?: boolean) => {
    const Icon = icon;
    return (
      <DropdownMenuItem
        onClick={onClick}
        className={`flex items-center justify-between py-3 px-4 cursor-pointer ${destructive ? "text-destructive" : ""}`}
      >
        <span>{label}</span>
        <Icon className={`h-5 w-5 ${destructive ? "" : "text-muted-foreground"}`} />
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={stop}>
        <button className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary">
          <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50 bg-background border border-border shadow-lg">
        {isOwner ? (
          <>
            {menuItem("Pin to your profile", Pin, handlePin)}
            {menuItem("Copy post text", Copy, handleCopy)}
            <DropdownMenuSeparator />
            {menuItem("Mute thread", BellOff, handleMuteThread)}
            <DropdownMenuSeparator />
            {menuItem("Delete post", Trash2, handleDelete, true)}
          </>
        ) : (
          <>
            {menuItem("Copy post text", Copy, handleCopy)}
            <DropdownMenuSeparator />
            {menuItem("Mute thread", BellOff, handleMuteThread)}
            <DropdownMenuSeparator />
            {menuItem("Hide post for me", EyeOff, handleHidePost)}
            <DropdownMenuSeparator />
            {menuItem("Mute account", VolumeX, handleMuteAccount)}
            {menuItem("Block account", UserX, handleBlockAccount)}
            {menuItem("Report post", AlertTriangle, handleReport)}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
