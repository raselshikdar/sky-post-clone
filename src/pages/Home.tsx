import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, TrendingUp, ArrowUp, Radio } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import Composer from "@/components/Composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useAllLiveUsers } from "@/hooks/use-live-status";
import LiveViewerCount from "@/components/LiveViewerCount";

type FeedTab = "discover" | "following" | "whats-hot";

export default function Home() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<FeedTab>(() => {
    const saved = localStorage.getItem("home_feed_tab");
    return saved === "following" || saved === "whats-hot" ? saved : "discover";
  });

  useEffect(() => {
    localStorage.setItem("home_feed_tab", tab);
  }, [tab]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerAutoImage, setComposerAutoImage] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const headerHidden = useScrollDirection();
  const { data: liveUsers = [] } = useAllLiveUsers();

  // Back to top: track scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          id, content, created_at, parent_id, author_id, quote_post_id, video_url, embed_url,
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
      
      const quotePostIds = filtered.map((p) => (p as any).quote_post_id).filter(Boolean) as string[];
      
      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes, imagesRes, quotePostsRes, quoteImagesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
        user ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        supabase.from("post_images").select("post_id, url, position").in("post_id", postIds).order("position"),
        quotePostIds.length > 0
          ? supabase.from("posts").select("id, content, created_at, author_id, profiles!posts_author_id_fkey (username, display_name, avatar_url)").in("id", quotePostIds)
          : { data: [] },
        quotePostIds.length > 0
          ? supabase.from("post_images").select("post_id, url, position").in("post_id", quotePostIds).order("position")
          : { data: [] },
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

      const quotePostMap: Record<string, any> = {};
      const quoteImages: Record<string, string[]> = {};
      (quoteImagesRes.data || []).forEach((img: any) => {
        if (!quoteImages[img.post_id]) quoteImages[img.post_id] = [];
        quoteImages[img.post_id].push(img.url);
      });
      (quotePostsRes.data || []).forEach((qp: any) => {
        const qProfile = qp.profiles as any;
        quotePostMap[qp.id] = {
          id: qp.id, content: qp.content,
          authorName: qProfile?.display_name || "", authorHandle: qProfile?.username || "",
          authorAvatar: qProfile?.avatar_url || "", createdAt: qp.created_at,
          images: quoteImages[qp.id],
        };
      });

      let result = filtered.map((post) => {
        const p = post.profiles as any;
        return {
          id: post.id, authorId: post.author_id,
          authorName: p?.display_name || "Unknown", authorHandle: p?.username || "unknown",
          authorAvatar: p?.avatar_url || "", content: post.content, createdAt: post.created_at,
          images: postImages[post.id],
          videoUrl: (post as any).video_url || null,
          embedUrl: (post as any).embed_url || null,
          likeCount: likeCounts[post.id] || 0, replyCount: replyCounts[post.id] || 0,
          repostCount: repostCounts[post.id] || 0,
          isLiked: userLikedSet.has(post.id), isReposted: userRepostedSet.has(post.id),
          quotePost: (post as any).quote_post_id ? quotePostMap[(post as any).quote_post_id] || null : null,
        };
      });

      if (tab === "whats-hot") {
        result.sort((a, b) => (b.likeCount + b.repostCount + b.replyCount) - (a.likeCount + a.repostCount + a.replyCount));
      }

      return result;
    },
  });

  return (
    <div className="flex flex-col">
      <div className={`sticky top-[41px] lg:top-0 z-20 bg-background/95 backdrop-blur-sm transition-transform duration-300 ${headerHidden ? "-translate-y-[calc(100%+41px)] lg:-translate-y-full" : "translate-y-0"}`}>
        <div className="flex w-full items-center justify-between border-b border-border px-[18px]">
          <TabButton label={t("home.discover")} active={tab === "discover"} onClick={() => setTab("discover")} />
          <TabButton label={t("home.following")} active={tab === "following"} onClick={() => setTab("following")} />
          <TabButton label={t("home.whats_hot")} active={tab === "whats-hot"} onClick={() => setTab("whats-hot")} />
        </div>
      </div>

      {/* Live Now Banner */}
      {liveUsers.length > 0 && (
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-4 w-4 text-destructive animate-pulse" />
            <span className="text-sm font-bold">Live Now</span>
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-1">
              {liveUsers.slice(0, 10).map((ls: any) => {
                const p = ls.profiles;
                if (!p) return null;
                return (
                  <button key={ls.id} onClick={() => navigate(`/profile/${p.username}`)} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-destructive ring-offset-2 ring-offset-background">
                        <AvatarImage src={p.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{p.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-[7px] font-bold px-1 rounded animate-pulse leading-none">LIVE</span>
                    </div>
                    <span className="text-[11px] font-medium text-foreground truncate max-w-[60px]">{p.display_name}</span>
                    <LiveViewerCount liveStatusId={ls.id} isAudio={ls.stream_type === "audio"} className="text-[10px]" />
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="h-0" />
          </ScrollArea>
        </div>
      )}

      {tab === "discover" && showTopics && trendingTopics.length > 0 && (
        <div className="flex items-center border-b border-border">
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-0.5 px-2 py-2">
              <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mx-1" />
              {trendingTopics.map((topic) => (
                <button key={topic} onClick={() => navigate(`/trending/${encodeURIComponent(topic)}`)}
                  className="whitespace-nowrap rounded-full px-3 py-1 text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
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

      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <button onClick={() => setComposerOpen(true)} className="flex-1 text-left text-muted-foreground text-[15px]">
          {t("home.whats_up")}
        </button>
        <button onClick={() => { setComposerAutoImage(true); setComposerOpen(true); }}>
          <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </div>

      {isLoading ? (
        <div>{Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">{t("home.no_posts")}</p>
          <p className="mt-1 text-sm">{t("home.be_first")}</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} {...post} />)
      )}

      <Composer open={composerOpen} onOpenChange={(v) => { setComposerOpen(v); if (!v) setComposerAutoImage(false); }} autoOpenImagePicker={composerAutoImage} />

      {showBackToTop && (
        <button onClick={scrollToTop}
          className="fixed bottom-20 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-md text-primary border border-border shadow-lg transition-all hover:scale-105 active:scale-95 lg:bottom-6 lg:left-[calc(50%-340px)]"
          aria-label="Back to top">
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`relative py-3 whitespace-nowrap text-[15px] font-semibold leading-[1.2] transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      <span className="relative">
        {label}
        {active && <div className="absolute -bottom-[11px] left-0 right-0 h-[3px] rounded-full bg-primary" />}
      </span>
    </button>
  );
}
