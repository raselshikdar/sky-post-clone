import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [tab, setTab] = useState<"following" | "discover">("discover");
  const [composerOpen, setComposerOpen] = useState(false);
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", tab],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          id,
          content,
          created_at,
          parent_id,
          author_id,
          profiles!posts_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tab === "following" && user) {
        // Get following IDs first
        const { data: following } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        const ids = following?.map((f) => f.following_id) || [];
        if (ids.length === 0) return [];
        query = query.in("author_id", ids);
      }

      const { data } = await query;
      if (!data) return [];

      // Get counts and user interactions
      const postIds = data.map((p) => p.id);
      
      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
        user ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
      ]);

      const likeCounts: Record<string, number> = {};
      const repostCounts: Record<string, number> = {};
      const replyCounts: Record<string, number> = {};
      const userLikedSet = new Set((userLikesRes.data || []).map((l) => l.post_id));
      const userRepostedSet = new Set((userRepostsRes.data || []).map((r) => r.post_id));

      (likesRes.data || []).forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      (repostsRes.data || []).forEach((r) => { repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1; });
      (repliesRes.data || []).forEach((r) => { if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1; });

      return data.map((post) => {
        const profile = post.profiles as any;
        return {
          id: post.id,
          authorId: post.author_id,
          authorName: profile?.display_name || "Unknown",
          authorHandle: profile?.username || "unknown",
          authorAvatar: profile?.avatar_url || "",
          content: post.content,
          createdAt: post.created_at,
          likeCount: likeCounts[post.id] || 0,
          replyCount: replyCounts[post.id] || 0,
          repostCount: repostCounts[post.id] || 0,
          isLiked: userLikedSet.has(post.id),
          isReposted: userRepostedSet.has(post.id),
        };
      });
    },
  });

  return (
    <div className="flex flex-col">
      {/* Tabs Header */}
      <div className="sticky top-0 z-20 hidden border-b border-border bg-background/95 backdrop-blur-sm lg:block">
        <div className="flex">
          <TabButton label="Following" active={tab === "following"} onClick={() => setTab("following")} />
          <TabButton label="Discover" active={tab === "discover"} onClick={() => setTab("discover")} />
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="sticky top-[49px] z-20 flex border-b border-border bg-background/95 backdrop-blur-sm lg:hidden">
        <TabButton label="Following" active={tab === "following"} onClick={() => setTab("following")} />
        <TabButton label="Discover" active={tab === "discover"} onClick={() => setTab("discover")} />
      </div>

      {/* New Post button (desktop) */}
      <div className="hidden border-b border-border lg:block">
        <button
          onClick={() => setComposerOpen(true)}
          className="w-full px-4 py-3 text-left text-muted-foreground transition-colors bsky-hover"
        >
          What's up?
        </button>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No posts yet</p>
          <p className="mt-1 text-sm">Be the first to post something!</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} {...post} />)
      )}

      <Composer open={composerOpen} onOpenChange={setComposerOpen} />
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
      {active && (
        <div className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-primary" />
      )}
    </button>
  );
}
