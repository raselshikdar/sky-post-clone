import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import AwajLogo from "@/components/AwajLogo";
import MobileTopBarPublic from "@/components/MobileTopBarPublic";
import PublicDrawer from "@/components/PublicDrawer";

type FeedTab = "discover" | "feeds";

export default function PublicFeed() {
  const [tab, setTab] = useState<FeedTab>("discover");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["public_posts", tab],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`
          id, content, created_at, parent_id, author_id, quote_post_id,
          profiles!posts_author_id_fkey (id, username, display_name, avatar_url)
        `)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data) return [];

      const postIds = data.map((p) => p.id);
      if (postIds.length === 0) return [];

      const quotePostIds = data.map((p) => (p as any).quote_post_id).filter(Boolean) as string[];

      const [likesRes, repostsRes, repliesRes, imagesRes, quotePostsRes, quoteImagesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
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

      return data.map((post) => {
        const p = post.profiles as any;
        return {
          id: post.id, authorId: post.author_id,
          authorName: p?.display_name || "Unknown", authorHandle: p?.username || "unknown",
          authorAvatar: p?.avatar_url || "", content: post.content, createdAt: post.created_at,
          images: postImages[post.id],
          likeCount: likeCounts[post.id] || 0, replyCount: replyCounts[post.id] || 0,
          repostCount: repostCounts[post.id] || 0,
          isLiked: false, isReposted: false,
          quotePost: (post as any).quote_post_id ? quotePostMap[(post as any).quote_post_id] || null : null,
        };
      });
    },
  });

  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <PublicDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <div className="flex w-full max-w-feed flex-col border-x border-border min-h-screen">
        {/* Mobile top bar */}
        <MobileTopBarPublic onMenuClick={() => setDrawerOpen(true)} />

        {/* Desktop header - logo centered */}
        <div className="hidden lg:flex items-center justify-center border-b border-border py-3">
          <AwajLogo className="h-8 w-8" />
        </div>

        {/* Tabs */}
        <div className="sticky top-[49px] lg:top-0 z-20 bg-background/95 backdrop-blur-sm">
          <div className="flex w-full items-center justify-between border-b border-border px-14">
            <TabButton label="Discover" active={tab === "discover"} onClick={() => setTab("discover")} />
            <TabButton label="Feeds ✨" active={tab === "feeds"} onClick={() => setTab("feeds")} />
          </div>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div>{Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} {...post} />)
        )}

        {/* Bottom padding for sticky bar */}
        <div className="h-20" />
      </div>

      {/* Sticky bottom CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-feed items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <AwajLogo className="h-7 w-7" />
            <span className="text-lg font-bold text-foreground hidden sm:inline">Awaj</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/auth?view=signup")}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Create account
            </button>
            <button
              onClick={() => navigate("/auth?view=signin")}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>

      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
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
      className={`relative py-3 whitespace-nowrap text-sm font-semibold transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
      {label}
      {active && <div className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-primary" />}
    </button>
  );
}
