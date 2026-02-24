import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, TrendingUp } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon } from "lucide-react";

type FeedTab = "discover" | "following" | "whats-hot";

export default function Home() {
  const [tab, setTab] = useState<FeedTab>("discover");
  const [composerOpen, setComposerOpen] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Trending topics from actual post content (extract top words)
  const { data: trendingTopics = [] } = useQuery({
    queryKey: ["home_trending_topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("content")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!data) return [];
      // Extract hashtags and common words
      const wordMap: Record<string, number> = {};
      data.forEach((p) => {
        const hashtags = p.content.match(/#(\w+)/g);
        if (hashtags) {
          hashtags.forEach((tag: string) => {
            const clean = tag.replace("#", "");
            wordMap[clean] = (wordMap[clean] || 0) + 1;
          });
        }
      });
      // If no hashtags, show default categories from feeds
      if (Object.keys(wordMap).length === 0) {
        return ["Technology", "Sports", "Politics", "Entertainment", "Science", "Gaming", "Music", "Art"];
      }
      return Object.entries(wordMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);
    },
    staleTime: 300000,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", tab],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          id, content, created_at, parent_id, author_id,
          profiles!posts_author_id_fkey (id, username, display_name, avatar_url)
        `)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tab === "following" && user) {
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

      // Filter out hidden posts, muted threads, muted/blocked authors
      let filtered = data;
      if (user) {
        const [hiddenRes, mutedThreadsRes, mutedAccRes, blockedRes] = await Promise.all([
          supabase.from("hidden_posts").select("post_id").eq("user_id", user.id),
          supabase.from("muted_threads").select("post_id").eq("user_id", user.id),
          supabase.from("muted_accounts").select("muted_user_id").eq("user_id", user.id),
          supabase.from("blocked_accounts").select("blocked_user_id").eq("user_id", user.id),
        ]);
        const hiddenIds = new Set((hiddenRes.data || []).map((h) => h.post_id));
        const mutedThreadIds = new Set((mutedThreadsRes.data || []).map((m) => m.post_id));
        const mutedUserIds = new Set((mutedAccRes.data || []).map((m) => m.muted_user_id));
        const blockedUserIds = new Set((blockedRes.data || []).map((b) => b.blocked_user_id));
        filtered = data.filter((p) => !hiddenIds.has(p.id) && !mutedThreadIds.has(p.id) && !mutedUserIds.has(p.author_id) && !blockedUserIds.has(p.author_id));
      }

      const postIds = filtered.map((p) => p.id);
      if (postIds.length === 0) return [];
      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes, imagesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
        user ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        supabase.from("post_images").select("post_id, url, position").in("post_id", postIds).order("position"),
      ]);

      const likeCounts: Record<string, number> = {};
      const repostCounts: Record<string, number> = {};
      const replyCounts: Record<string, number> = {};
      const postImages: Record<string, string[]> = {};
      const userLikedSet = new Set((userLikesRes.data || []).map((l) => l.post_id));
      const userRepostedSet = new Set((userRepostsRes.data || []).map((r) => r.post_id));

      (likesRes.data || []).forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      (repostsRes.data || []).forEach((r) => { repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1; });
      (repliesRes.data || []).forEach((r) => { if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1; });
      (imagesRes.data || []).forEach((img) => {
        if (!postImages[img.post_id]) postImages[img.post_id] = [];
        postImages[img.post_id].push(img.url);
      });

      let result = filtered.map((post) => {
        const p = post.profiles as any;
        return {
          id: post.id,
          authorId: post.author_id,
          authorName: p?.display_name || "Unknown",
          authorHandle: p?.username || "unknown",
          authorAvatar: p?.avatar_url || "",
          content: post.content,
          createdAt: post.created_at,
          images: postImages[post.id],
          likeCount: likeCounts[post.id] || 0,
          replyCount: replyCounts[post.id] || 0,
          repostCount: repostCounts[post.id] || 0,
          isLiked: userLikedSet.has(post.id),
          isReposted: userRepostedSet.has(post.id),
        };
      });

      // "What's Hot" tab: sort by engagement (likes + reposts + replies)
      if (tab === "whats-hot") {
        result.sort((a, b) => (b.likeCount + b.repostCount + b.replyCount) - (a.likeCount + a.repostCount + a.replyCount));
      }

      return result;
    },
  });

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="sticky top-[49px] lg:top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex border-b border-border">
          <TabButton label="Discover" active={tab === "discover"} onClick={() => setTab("discover")} />
          <TabButton label="Following" active={tab === "following"} onClick={() => setTab("following")} />
          <TabButton label="What's Hot Classic" active={tab === "whats-hot"} onClick={() => setTab("whats-hot")} />
        </div>

        {/* Trending topics row - only on Discover tab */}
        {tab === "discover" && showTopics && trendingTopics.length > 0 && (
          <div className="flex items-center border-b border-border">
            <ScrollArea className="flex-1">
              <div className="flex items-center gap-0.5 px-2 py-2">
                <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mx-1" />
                {trendingTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(topic)}`)}
                    className="whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="h-0" />
            </ScrollArea>
            <button onClick={() => setShowTopics(false)} className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Composer prompt */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => setComposerOpen(true)}
          className="flex-1 text-left text-muted-foreground text-[15px]"
        >
          What's up?
        </button>
        <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
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
