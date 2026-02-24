import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Heart, Repeat2, UserPlus, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const typeIcons: Record<string, any> = {
  like: Heart,
  repost: Repeat2,
  follow: UserPlus,
  reply: MessageCircle,
  mention: MessageCircle,
};

const typeColors: Record<string, string> = {
  like: "text-bsky-like",
  repost: "text-bsky-repost",
  follow: "text-primary",
  reply: "text-primary",
  mention: "text-primary",
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "mentions">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", tab],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("notifications")
        .select(`id, type, post_id, read, created_at, actor:profiles!notifications_actor_id_fkey (id, username, display_name, avatar_url)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tab === "mentions") query = query.eq("type", "mention");

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm lg:top-0">
        <h2 className="hidden px-4 py-3 text-lg font-bold lg:block">Notifications</h2>
        <div className="flex">
          <TabButton label="All" active={tab === "all"} onClick={() => setTab("all")} />
          <TabButton label="Mentions" active={tab === "mentions"} onClick={() => setTab("mentions")} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        notifications.map((n: any) => {
          const Icon = typeIcons[n.type] || Bell;
          const actor = n.actor as any;
          return (
            <div
              key={n.id}
              className={`flex gap-3 px-4 py-3 bsky-divider cursor-pointer bsky-hover ${!n.read ? "bg-primary/5" : ""}`}
              onClick={() => n.post_id ? navigate(`/post/${n.post_id}`) : navigate(`/profile/${actor?.username}`)}
            >
              <div className={`mt-0.5 ${typeColors[n.type]}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} fill={n.type === "like" ? "currentColor" : "none"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={actor?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {actor?.display_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="mt-1 text-sm">
                  <strong>{actor?.display_name}</strong>{" "}
                  <span className="text-muted-foreground">
                    {n.type === "like" && "liked your post"}
                    {n.type === "repost" && "reposted your post"}
                    {n.type === "follow" && "followed you"}
                    {n.type === "reply" && "replied to your post"}
                    {n.type === "mention" && "mentioned you"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 py-3 text-sm font-semibold transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {active && <div className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-primary" />}
    </button>
  );
}
