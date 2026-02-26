import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Heart, Repeat2, UserPlus, MessageCircle, Settings, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";

const typeIcons: Record<string, any> = {
  like: Heart,
  repost: Repeat2,
  follow: UserPlus,
  reply: MessageCircle,
  mention: AtSign,
};

const typeColors: Record<string, string> = {
  like: "text-[hsl(var(--bsky-like))]",
  repost: "text-[hsl(var(--bsky-repost))]",
  follow: "text-primary",
  reply: "text-primary",
  mention: "text-primary",
};

const typeText: Record<string, string> = {
  like: "liked your post",
  repost: "reposted your post",
  follow: "followed you",
  reply: "replied to your post",
  mention: "mentioned you",
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "mentions">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", tab, user?.id],
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

  // Check who I follow (for follow-back button)
  const { data: myFollowing = [] } = useQuery({
    queryKey: ["my_following_ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      return (data || []).map((f: any) => f.following_id);
    },
    enabled: !!user,
  });

  // Mark all as read on mount
  useEffect(() => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter((n: any) => !n.read);
    if (unread.length === 0) return;

    supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread_notifications_count"] });
      });
  }, [notifications, user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unread_notifications_count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Follow-back mutation
  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      await supabase.from("follows").insert({ follower_id: user!.id, following_id: targetId });
      // Create follow notification for the other user
      await supabase.from("notifications").insert({
        user_id: targetId, actor_id: user!.id, type: "follow"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_following_ids"] });
    },
  });

  // Group consecutive same-type notifications from different actors
  const grouped = groupNotifications(notifications);

  return (
    <div className="flex flex-col min-h-[calc(100vh-49px)]">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-xl font-bold">Notifications</h2>
          <button onClick={() => navigate("/notifications/settings")} className="text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <div className="flex">
          <TabButton label="All" active={tab === "all"} onClick={() => setTab("all")} />
          <TabButton label="Mentions" active={tab === "mentions"} onClick={() => setTab("mentions")} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12">
          <Bell className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div>
          {grouped.map((item, idx) => {
            if (item.actors.length > 1) {
              // Grouped notification (e.g. "Jeffrey and 1 other followed you")
              return (
                <GroupedNotification
                  key={idx}
                  item={item}
                  navigate={navigate}
                  myFollowing={myFollowing}
                  onFollow={(id) => followMutation.mutate(id)}
                />
              );
            }

            const n = item.notifications[0];
            const actor = n.actor as any;
            const Icon = typeIcons[n.type] || Bell;
            const isFollowType = n.type === "follow";
            const alreadyFollowing = myFollowing.includes(actor?.id);

            return (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3.5 border-b border-border cursor-pointer transition-colors hover:bg-accent/30 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
                onClick={() => n.post_id ? navigate(`/post/${n.post_id}`) : navigate(`/profile/${actor?.username}`)}
              >
                <div className={`mt-1 flex-shrink-0 ${typeColors[n.type]}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} fill={n.type === "like" ? "currentColor" : "none"} />
                </div>
                <div className="min-w-0 flex-1">
                  <Avatar className="h-9 w-9 mb-1.5">
                    <AvatarImage src={actor?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {actor?.display_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[15px]">
                    <strong
                      className="hover:underline cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${actor?.username}`); }}
                    >{actor?.display_name}</strong>{" "}
                    <span className="text-muted-foreground">{typeText[n.type] || n.type}</span>
                    <span className="text-muted-foreground"> · {timeAgo(n.created_at)}</span>
                  </p>
                  {isFollowType && !alreadyFollowing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); followMutation.mutate(actor.id); }}
                      className="mt-2 flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      + Follow back
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Group consecutive follow notifications together
function groupNotifications(notifications: any[]) {
  const result: { type: string; actors: any[]; notifications: any[]; postId?: string }[] = [];

  notifications.forEach((n: any) => {
    const last = result[result.length - 1];
    if (
      last &&
      last.type === n.type &&
      n.type === "follow" &&
      last.notifications.length < 5
    ) {
      last.actors.push(n.actor);
      last.notifications.push(n);
    } else {
      result.push({
        type: n.type,
        actors: [n.actor],
        notifications: [n],
        postId: n.post_id,
      });
    }
  });

  return result;
}

function GroupedNotification({
  item, navigate, myFollowing, onFollow
}: {
  item: { type: string; actors: any[]; notifications: any[]; postId?: string };
  navigate: any;
  myFollowing: string[];
  onFollow: (id: string) => void;
}) {
  const Icon = typeIcons[item.type] || Bell;
  const firstActor = item.actors[0];
  const othersCount = item.actors.length - 1;
  const isUnread = item.notifications.some((n: any) => !n.read);

  return (
    <div
      className={`flex gap-3 px-4 py-3.5 border-b border-border cursor-pointer transition-colors hover:bg-accent/30 ${
        isUnread ? "bg-primary/5" : ""
      }`}
      onClick={() => item.postId ? navigate(`/post/${item.postId}`) : navigate(`/profile/${firstActor?.username}`)}
    >
      <div className={`mt-1 flex-shrink-0 ${typeColors[item.type]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} fill={item.type === "like" ? "currentColor" : "none"} />
      </div>
      <div className="min-w-0 flex-1">
        {/* Stacked avatars */}
        <div className="flex -space-x-2 mb-1.5">
          {item.actors.slice(0, 3).map((actor: any, i: number) => (
            <Avatar key={i} className="h-9 w-9 border-2 border-background">
              <AvatarImage src={actor?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {actor?.display_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {item.actors.length > 3 && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-medium text-muted-foreground">
              +{item.actors.length - 3}
            </div>
          )}
        </div>
        <p className="text-[15px]">
          <strong
            className="hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${firstActor?.username}`); }}
          >{firstActor?.display_name}</strong>
          {othersCount > 0 && <> and <strong>{othersCount} {othersCount === 1 ? "other" : "others"}</strong></>}
          {" "}
          <span className="text-muted-foreground">
            {typeText[item.type] || item.type}
            {" · "}
            {timeAgo(item.notifications[0].created_at)}
          </span>
        </p>
        {item.type === "follow" && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {item.actors.filter((a: any) => !myFollowing.includes(a?.id)).slice(0, 2).map((actor: any) => (
              <button
                key={actor?.id}
                onClick={(e) => { e.stopPropagation(); onFollow(actor.id); }}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                + Follow back
              </button>
            ))}
          </div>
        )}
      </div>
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
