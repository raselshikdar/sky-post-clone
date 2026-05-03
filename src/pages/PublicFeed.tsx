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
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { devValidateRpcPayload } from "@/lib/postShape";

type FeedTab = "discover" | "feeds";

export default function PublicFeed() {
  const [tab, setTab] = useState<FeedTab>("discover");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const headerHidden = useScrollDirection();

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["public_posts", tab],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_posts_by_search", {
        p_pattern: null,
        p_viewer_id: null,
        p_limit: 50,
      });
      if (error) { console.error("get_posts_by_search error:", error); return []; }
      const list = (data as any[]) || [];
      devValidateRpcPayload("get_posts_by_search (PublicFeed)", list, "flat");
      return list;
    },
  });

  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <PublicDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <div className="flex w-full max-w-feed flex-col border-x border-border min-h-screen">
        {/* Mobile top bar */}
        <MobileTopBarPublic onMenuClick={() => setDrawerOpen(true)} hidden={headerHidden} />

        {/* Desktop header - logo centered */}
        <div className={`hidden lg:flex items-center justify-center border-b border-border py-1.5 sticky top-0 z-30 bg-background/95 backdrop-blur-sm transition-transform duration-300 ${headerHidden ? "-translate-y-full" : "translate-y-0"}`}>
          <AwajLogo className="h-8 w-8" />
        </div>

        {/* Tabs */}
        <div className={`sticky top-[41px] lg:top-[41px] z-20 bg-background/95 backdrop-blur-sm transition-transform duration-300 ${headerHidden ? "-translate-y-[calc(100%+41px)] lg:-translate-y-[calc(100%+41px)]" : "translate-y-0"}`}>
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
            <span className="text-lg font-bold text-foreground">Awaj</span>
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
