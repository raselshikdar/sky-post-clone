import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Pin, PinOff, AlertCircle, Share, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface TrendingTopicInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicName: string;
}

export default function TrendingTopicInfoDialog({ open, onOpenChange, topicName }: TrendingTopicInfoDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Like count
  const { data: likeCount = 0 } = useQuery({
    queryKey: ["topic_like_count", topicName],
    queryFn: async () => {
      const { count } = await supabase
        .from("trending_topic_likes")
        .select("*", { count: "exact", head: true })
        .eq("topic_name", topicName);
      return count || 0;
    },
    enabled: open,
  });

  // User liked?
  const { data: isLiked = false } = useQuery({
    queryKey: ["topic_liked", topicName, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trending_topic_likes")
        .select("id")
        .eq("user_id", user!.id)
        .eq("topic_name", topicName)
        .maybeSingle();
      return !!data;
    },
    enabled: open && !!user,
  });

  // User pinned?
  const { data: isPinned = false } = useQuery({
    queryKey: ["topic_pinned", topicName, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trending_topic_pins")
        .select("id")
        .eq("user_id", user!.id)
        .eq("topic_name", topicName)
        .maybeSingle();
      return !!data;
    },
    enabled: open && !!user,
  });

  const handleLike = async () => {
    if (!user) return;
    if (isLiked) {
      await supabase.from("trending_topic_likes").delete().eq("user_id", user.id).eq("topic_name", topicName);
      toast.success("Removed like");
    } else {
      const { error } = await supabase.from("trending_topic_likes").insert({ user_id: user.id, topic_name: topicName });
      if (error?.code === "23505") { toast.info("Already liked"); return; }
      if (error) { toast.error("Failed to like"); return; }
      toast.success("Liked!");
    }
    queryClient.invalidateQueries({ queryKey: ["topic_liked", topicName] });
    queryClient.invalidateQueries({ queryKey: ["topic_like_count", topicName] });
  };

  const handlePin = async () => {
    if (!user) return;
    if (isPinned) {
      await supabase.from("trending_topic_pins").delete().eq("user_id", user.id).eq("topic_name", topicName);
      toast.success("Feed unpinned");
    } else {
      const { error } = await supabase.from("trending_topic_pins").insert({ user_id: user.id, topic_name: topicName });
      if (error?.code === "23505") { toast.info("Already pinned"); return; }
      if (error) { toast.error("Failed to pin"); return; }
      toast.success("Feed pinned!");
    }
    queryClient.invalidateQueries({ queryKey: ["topic_pinned", topicName] });
  };

  const handleReport = async () => {
    if (!user) return;
    const { error } = await supabase.from("trending_topic_reports").insert({ reporter_id: user.id, topic_name: topicName });
    if (error?.code === "23505") { toast.info("Already reported"); return; }
    if (error) { toast.error("Failed to report"); return; }
    toast.success("Report submitted");
    onOpenChange(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/trending/${encodeURIComponent(topicName)}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground flex-shrink-0">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold truncate">{topicName}</h3>
            <p className="text-sm text-muted-foreground">Trending topic feed</p>
          </div>
          <button onClick={handleShare} className="rounded-full p-2 hover:bg-accent transition-colors flex-shrink-0">
            <Share className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-primary cursor-default">
          Liked by {likeCount} {likeCount === 1 ? "user" : "users"}
        </p>

        <div className="flex items-center gap-3">
          <Button
            variant={isLiked ? "default" : "outline"}
            className="flex-1 rounded-full gap-2"
            onClick={handleLike}
          >
            <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
            {isLiked ? "Liked" : "Like"}
          </Button>
          <Button
            variant={isPinned ? "default" : "outline"}
            className="flex-1 rounded-full gap-2"
            onClick={handlePin}
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {isPinned ? "Unpin feed" : "Pin feed"}
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground italic">Something wrong? Let us know.</p>
          <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={handleReport}>
            Report feed <AlertCircle className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
