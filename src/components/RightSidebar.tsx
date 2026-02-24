import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function RightSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Trending: top hashtags / most-liked posts in last 7 days
  const { data: trendingPosts = [] } = useQuery({
    queryKey: ["trending_sidebar"],
    queryFn: async () => {
      // Get posts with most likes
      const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      if (!likes || likes.length === 0) return [];

      const counts: Record<string, number> = {};
      likes.forEach((l) => { counts[l.post_id] = (counts[l.post_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const topIds = sorted.map(([id]) => id);

      const { data: posts } = await supabase
        .from("posts")
        .select("id, content")
        .in("id", topIds);

      return sorted.map(([id, count]) => {
        const post = posts?.find((p) => p.id === id);
        const words = (post?.content || "").split(/\s+/).slice(0, 5).join(" ");
        return { id, label: words || "Post", count };
      });
    },
    staleTime: 120000,
  });

  // Suggested users: random profiles the user doesn't follow
  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ["suggested_users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: following } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const followingIds = new Set((following || []).map((f) => f.following_id));
      followingIds.add(user.id); // exclude self

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .limit(20);

      const candidates = (profiles || []).filter((p) => !followingIds.has(p.id));
      // Shuffle and take 3
      return candidates.sort(() => Math.random() - 0.5).slice(0, 3);
    },
    enabled: !!user,
    staleTime: 120000,
  });

  const handleFollow = async (userId: string) => {
    if (!user) return;
    const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    if (error?.code === "23505") { toast.info("Already following"); return; }
    if (error) { toast.error("Failed to follow"); return; }
    toast.success("Followed!");
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[320px] flex-col gap-4 overflow-y-auto py-4 pl-6 xl:flex">
      {/* Search */}
      <div className="relative" onClick={() => navigate("/search")}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search"
          className="rounded-full border-border bg-secondary pl-9 focus-visible:ring-primary cursor-pointer"
          readOnly
        />
      </div>

      {/* Trending */}
      <div className="rounded-2xl bg-secondary p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="h-5 w-5" />
          What's Hot
        </h3>
        <div className="space-y-3">
          {trendingPosts.length > 0 ? (
            trendingPosts.map((topic) => (
              <div
                key={topic.id}
                onClick={() => navigate(`/post/${topic.id}`)}
                className="cursor-pointer transition-colors bsky-hover rounded-lg p-2 -mx-2"
              >
                <p className="text-sm font-semibold truncate">{topic.label}</p>
                <p className="text-xs text-muted-foreground">{topic.count} likes</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No trending posts yet</p>
          )}
        </div>
      </div>

      {/* Suggested */}
      <div className="rounded-2xl bg-secondary p-4">
        <h3 className="mb-3 text-lg font-bold">Suggested for you</h3>
        <div className="space-y-3">
          {suggestedUsers.length > 0 ? (
            suggestedUsers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate(`/profile/${u.username}`)}>
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/profile/${u.username}`)}>
                  <p className="truncate text-sm font-semibold flex items-center gap-1">
                    {u.display_name}
                    <VerifiedBadge userId={u.id} className="h-3.5 w-3.5" />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold" onClick={() => handleFollow(u.id)}>
                  Follow
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No suggestions available</p>
          )}
        </div>
      </div>
    </aside>
  );
}
