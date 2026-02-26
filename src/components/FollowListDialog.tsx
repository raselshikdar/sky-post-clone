import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
}

export default function FollowListDialog({ open, onOpenChange, userId, type }: FollowListDialogProps) {
  const navigate = useNavigate();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["follow_list", userId, type],
    queryFn: async () => {
      if (type === "followers") {
        const { data } = await supabase
          .from("follows")
          .select("follower_id, profiles!follows_follower_id_fkey (id, username, display_name, avatar_url)")
          .eq("following_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);
        return (data || []).map((f: any) => f.profiles);
      } else {
        const { data } = await supabase
          .from("follows")
          .select("following_id, profiles!follows_following_id_fkey (id, username, display_name, avatar_url)")
          .eq("follower_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);
        return (data || []).map((f: any) => f.profiles);
      }
    },
    enabled: open && !!userId,
  });

  const handleUserClick = (username: string) => {
    onOpenChange(false);
    navigate(`/profile/${username}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-base font-bold capitalize">{type}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {type} yet
            </p>
          ) : (
            users.map((u: any) => (
              <button
                key={u.id}
                onClick={() => handleUserClick(u.username)}
                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {u.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
