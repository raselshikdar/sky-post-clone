import { useState } from "react";
import { Search as SearchIcon, X, Sparkles, Flame, Pin, ListFilter, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { timeAgo } from "@/lib/time";

// ---- Interests Section ----
function InterestsSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(true);

  const { data: allInterests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => {
      const { data } = await supabase.from("interests").select("*").order("name");
      return data || [];
    },
  });

  const { data: userInterestIds = [] } = useQuery({
    queryKey: ["user_interests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_interests").select("interest_id").eq("user_id", user.id);
      return (data || []).map((d: any) => d.interest_id);
    },
    enabled: !!user,
  });

  const toggleInterest = useMutation({
    mutationFn: async (interestId: string) => {
      if (!user) return;
      if (userInterestIds.includes(interestId)) {
        await supabase.from("user_interests").delete().eq("user_id", user.id).eq("interest_id", interestId);
      } else {
        await supabase.from("user_interests").insert({ user_id: user.id, interest_id: interestId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_interests"] }),
  });

  if (!visible || !user) return null;

  const selectedSet = new Set(userInterestIds);

  return (
    <div className="px-4 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold text-[15px]">Your interests</h3>
        </div>
        <button onClick={() => setVisible(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {allInterests.map((interest: any) => (
          <button
            key={interest.id}
            onClick={() => toggleInterest.mutate(interest.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedSet.has(interest.id)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-accent"
            }`}
          >
            {interest.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Your interests help us find what you like!</p>
      <Button
        className="mt-3 w-full rounded-full font-semibold"
        onClick={() => toast.success(`${selectedSet.size} interests saved`)}
      >
        Edit interests
      </Button>
    </div>
  );
}

// ---- Trending Topics ----
function TrendingTopics() {
  // Trending = users with most followers + recent posts
  const { data: trending = [] } = useQuery({
    queryKey: ["trending_topics"],
    queryFn: async () => {
      // Get recent popular posts (most likes in last 7 days)
      const { data: posts } = await supabase
        .from("posts")
        .select("id, content, created_at, author_id, profiles!posts_author_id_fkey(display_name, username, avatar_url)")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!posts || posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);
      const [likesRes, repliesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
      ]);

      const likeCounts: Record<string, number> = {};
      const replyCounts: Record<string, number> = {};
      (likesRes.data || []).forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      (repliesRes.data || []).forEach((r) => { if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1; });

      // Score = likes + replies
      const scored = posts.map((p) => ({
        ...p,
        score: (likeCounts[p.id] || 0) + (replyCounts[p.id] || 0),
        likeCount: likeCounts[p.id] || 0,
      }));

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 5);
    },
  });

  if (trending.length === 0) return null;

  return (
    <div className="border-b border-border">
      {trending.map((item: any, index: number) => {
        const profile = item.profiles as any;
        // Extract a title from content (first line or first 50 chars)
        const title = item.content.split("\n")[0].slice(0, 60);
        const category = item.likeCount > 2 ? "Trending" : "Popular";

        return (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0">
            <span className="mt-0.5 text-sm font-bold text-muted-foreground w-5">{index + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] leading-snug truncate">{title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex -space-x-1.5">
                  <Avatar className="h-4 w-4 border border-background">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[8px]">
                      {profile?.display_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-muted-foreground">{category}</span>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1">
              {index === 0 && <Flame className="h-3.5 w-3.5 text-orange-500" />}
              <span className={`text-sm font-semibold ${index === 0 ? "text-orange-500" : "text-muted-foreground"}`}>
                {index === 0 ? "Hot" : timeAgo(item.created_at) + " ago"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Discover Feeds Section ----
function DiscoverFeeds() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allFeeds = [] } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      const { data } = await supabase.from("feeds").select("*").order("liked_count", { ascending: false });
      return data || [];
    },
  });

  const { data: userFeeds = [] } = useQuery({
    queryKey: ["user_feeds", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_feeds").select("feed_id").eq("user_id", user.id);
      return (data || []).map((d: any) => d.feed_id);
    },
    enabled: !!user,
  });

  const pinFeed = useMutation({
    mutationFn: async (feedId: string) => {
      if (!user) return;
      if (userFeeds.includes(feedId)) {
        await supabase.from("user_feeds").delete().eq("user_id", user.id).eq("feed_id", feedId);
        toast.success("Feed unpinned");
      } else {
        await supabase.from("user_feeds").insert({ user_id: user.id, feed_id: feedId, is_pinned: true, pin_position: 0 });
        toast.success("Feed pinned");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_feeds"] }),
  });

  const pinnedSet = new Set(userFeeds);
  const filteredFeeds = allFeeds.filter((f: any) =>
    !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Discover new feeds</h3>
        </div>
        <button onClick={() => setShowSearch(!showSearch)} className="text-muted-foreground hover:text-foreground">
          <SearchIcon className="h-5 w-5" />
        </button>
      </div>

      {showSearch && (
        <div className="px-4 pb-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search feeds"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full bg-muted border-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {filteredFeeds.map((feed: any) => (
        <div key={feed.id} className="px-4 py-4 border-t border-border">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary rounded-lg text-sm font-bold">
                {feed.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[15px] truncate">{feed.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Feed by {feed.author_handle || "@unknown"}
                  </p>
                </div>
                <Button
                  variant={pinnedSet.has(feed.id) ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full text-primary border-primary hover:bg-primary/10 flex-shrink-0 text-xs h-8"
                  onClick={() => pinFeed.mutate(feed.id)}
                >
                  <Pin className="h-3 w-3 mr-1" />
                  {pinnedSet.has(feed.id) ? "Pinned" : "Pin Feed"}
                </Button>
              </div>
              {feed.description && (
                <p className="mt-1.5 text-sm text-foreground leading-relaxed">{feed.description}</p>
              )}
              {feed.liked_count > 0 && (
                <p className="mt-1 text-sm text-primary">Liked by {feed.liked_count} users</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Search Results ----
function SearchResults({ query }: { query: string }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"users" | "posts">("users");

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["search_users", query],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);
      return data || [];
    },
    enabled: query.length >= 2,
  });

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["search_posts", query],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, content, created_at, author_id, profiles!posts_author_id_fkey(display_name, username, avatar_url)")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: query.length >= 2,
  });

  const isLoading = tab === "users" ? loadingUsers : loadingPosts;

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["users", "posts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {tab === "users" && !loadingUsers && (
        <>
          {users.map((user: any) => (
            <div
              key={user.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent/50"
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              <Avatar className="h-11 w-11">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user.display_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.display_name}</p>
                <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                {user.bio && <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.bio}</p>}
              </div>
            </div>
          ))}
          {users.length === 0 && !loadingUsers && (
            <p className="py-12 text-center text-muted-foreground">No users found</p>
          )}
        </>
      )}

      {tab === "posts" && !loadingPosts && (
        <>
          {posts.map((post: any) => {
            const p = post.profiles as any;
            return (
              <div
                key={post.id}
                className="flex cursor-pointer gap-3 px-4 py-3 border-b border-border hover:bg-accent/50"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={p?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {p?.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{p?.display_name}</span>
                    <span className="text-sm text-muted-foreground truncate">@{p?.username}</span>
                    <span className="text-xs text-muted-foreground">· {timeAgo(post.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground line-clamp-3">{post.content}</p>
                </div>
              </div>
            );
          })}
          {posts.length === 0 && !loadingPosts && (
            <p className="py-12 text-center text-muted-foreground">No posts found</p>
          )}
        </>
      )}
    </div>
  );
}

// ---- Main Search/Explore Page ----
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length >= 2;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Menu className="h-5 w-5 text-foreground lg:hidden flex-shrink-0" />
          <h2 className="text-lg font-bold lg:hidden flex-shrink-0 mr-1">Explore</h2>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for posts, users, or feeds"
              className="rounded-full border-border bg-muted pl-9 pr-9 focus-visible:ring-primary h-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isSearching ? (
        <SearchResults query={query.trim()} />
      ) : (
        <>
          <InterestsSection />
          <TrendingTopics />
          <DiscoverFeeds />
        </>
      )}
    </div>
  );
}
