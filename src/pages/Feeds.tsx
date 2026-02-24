import { useState } from "react";
import { ArrowLeft, Settings, ChevronRight, Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil, Palette, Search, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  compass: Compass,
  "list-filter": ListFilter,
  flame: Flame,
  heart: Heart,
  users: Users,
  newspaper: Newspaper,
  pencil: Pencil,
  palette: Palette,
};

function formatLikedCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

export default function Feeds() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all available feeds
  const { data: allFeeds = [] } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      const { data } = await supabase.from("feeds").select("*").order("created_at");
      return data || [];
    },
  });

  // Fetch user's saved/pinned feeds
  const { data: userFeeds = [] } = useQuery({
    queryKey: ["user_feeds", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_feeds")
        .select("*, feeds(*)")
        .eq("user_id", user.id)
        .order("pin_position");
      return data || [];
    },
    enabled: !!user,
  });

  const pinFeedMutation = useMutation({
    mutationFn: async (feedId: string) => {
      if (!user) return;
      // Check if already saved
      const existing = userFeeds.find((uf: any) => uf.feed_id === feedId);
      if (existing) {
        // Toggle pin
        await supabase.from("user_feeds").update({ is_pinned: !existing.is_pinned }).eq("id", existing.id);
      } else {
        // Save and pin
        await supabase.from("user_feeds").insert({ user_id: user.id, feed_id: feedId, is_pinned: true, pin_position: userFeeds.length });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_feeds"] });
      toast.success("Feed updated");
    },
  });

  const savedFeedIds = new Set(userFeeds.map((uf: any) => uf.feed_id));
  const pinnedFeeds = userFeeds.filter((uf: any) => uf.is_pinned);
  const savedFeeds = userFeeds.filter((uf: any) => !uf.is_pinned);

  // My feeds = default feeds + user pinned feeds
  const defaultFeeds = allFeeds.filter((f: any) => f.is_default);
  const myFeeds = [
    ...defaultFeeds,
    ...pinnedFeeds.map((uf: any) => uf.feeds).filter(Boolean),
    ...savedFeeds.map((uf: any) => uf.feeds).filter(Boolean),
  ];

  // Discover feeds = non-default feeds not yet saved by user
  const discoverFeeds = allFeeds
    .filter((f: any) => !f.is_default && !savedFeedIds.has(f.id))
    .filter((f: any) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">Feeds</h2>
        <button onClick={() => navigate("/feeds/settings")} className="p-1">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* My Feeds header */}
      <div className="flex items-center gap-4 px-4 py-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
          <ListFilter className="h-7 w-7 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">My Feeds</h3>
          <p className="text-sm text-muted-foreground">All the feeds you've saved, right in one place.</p>
        </div>
      </div>

      {/* My Feed list */}
      <div className="border-t border-border">
        {myFeeds.map((feed: any) => {
          const Icon = iconMap[feed.icon] || Compass;
          return (
            <button
              key={feed.id}
              className="flex w-full items-center gap-4 px-4 py-4 bsky-hover border-b border-border"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feed.color} text-white`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="flex-1 text-left text-[15px] font-medium text-foreground">{feed.name}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Discover New Feeds */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <ListFilter className="h-7 w-7 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Discover New Feeds</h3>
            <p className="text-sm text-muted-foreground">Choose your own timeline! Feeds built by the community help you find content you love.</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feeds"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-lg bg-accent border-none"
          />
        </div>
      </div>

      {/* Discover feed list */}
      <div className="border-t border-border">
        {discoverFeeds.map((feed: any) => {
          const Icon = iconMap[feed.icon] || Compass;
          return (
            <div key={feed.id} className="px-4 py-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color} text-white`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[15px] text-foreground">{feed.name}</p>
                      <p className="text-sm text-muted-foreground">Feed by {feed.author_handle}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-primary border-primary hover:bg-primary/10 flex-shrink-0"
                      onClick={() => pinFeedMutation.mutate(feed.id)}
                    >
                      <Pin className="h-3.5 w-3.5 mr-1" />
                      Pin Feed
                    </Button>
                  </div>
                  {feed.description && (
                    <p className="mt-1 text-sm text-foreground">{feed.description}</p>
                  )}
                  {feed.liked_count > 0 && (
                    <p className="mt-1 text-sm text-primary">Liked by {formatLikedCount(feed.liked_count)} users</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {discoverFeeds.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            {searchQuery ? "No feeds match your search" : "You've saved all available feeds!"}
          </div>
        )}
      </div>
    </div>
  );
}
