import { useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, Bell, BellOff, Trash2, Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil, Palette, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

export default function FeedSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allFeeds = [] } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      const { data } = await supabase.from("feeds").select("*").order("created_at");
      return data || [];
    },
  });

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

  // Default feeds act as pinned feeds always
  const defaultFeeds = allFeeds.filter((f: any) => f.is_default);
  const pinnedUserFeeds = userFeeds.filter((uf: any) => uf.is_pinned);
  const savedUserFeeds = userFeeds.filter((uf: any) => !uf.is_pinned);

  // Combined pinned list: defaults + user-pinned
  const pinnedList = [
    ...defaultFeeds.map((f: any) => ({ ...f, _type: "default" })),
    ...pinnedUserFeeds.map((uf: any) => ({ ...uf.feeds, _type: "user_pinned", _ufId: uf.id })),
  ];

  const savedList = savedUserFeeds.map((uf: any) => ({ ...uf.feeds, _ufId: uf.id }));

  const movePinned = useMutation({
    mutationFn: async ({ ufId, direction }: { ufId: string; direction: "up" | "down" }) => {
      // Simple reorder - swap pin_position with neighbor
      const idx = pinnedUserFeeds.findIndex((uf: any) => uf.id === ufId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= pinnedUserFeeds.length) return;

      const current = pinnedUserFeeds[idx];
      const swap = pinnedUserFeeds[swapIdx];

      await Promise.all([
        supabase.from("user_feeds").update({ pin_position: swap.pin_position }).eq("id", current.id),
        supabase.from("user_feeds").update({ pin_position: current.pin_position }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_feeds"] }),
  });

  const removeFeed = useMutation({
    mutationFn: async (ufId: string) => {
      await supabase.from("user_feeds").delete().eq("id", ufId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_feeds"] });
      toast.success("Feed removed");
    },
  });

  const togglePin = useMutation({
    mutationFn: async (ufId: string) => {
      const uf = userFeeds.find((u: any) => u.id === ufId);
      if (!uf) return;
      await supabase.from("user_feeds").update({ is_pinned: !uf.is_pinned, pin_position: uf.is_pinned ? 0 : pinnedUserFeeds.length }).eq("id", ufId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_feeds"] });
    },
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/feeds")} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-lg font-bold">Feeds</h2>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/feeds")}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>

      {/* Pinned Feeds */}
      <div className="px-4 pt-5 pb-2">
        <h3 className="text-xl font-bold text-foreground">Pinned Feeds</h3>
      </div>
      <div className="border-t border-border">
        {pinnedList.map((feed: any, idx: number) => {
          const Icon = iconMap[feed.icon] || Compass;
          const isDefault = feed._type === "default";
          const isUserPinned = feed._type === "user_pinned";

          return (
            <div key={feed.id + (feed._ufId || "")} className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color} text-white`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-foreground truncate">{feed.name}</p>
                <p className="text-sm text-muted-foreground truncate">Feed by {feed.author_handle}</p>
              </div>
              <div className="flex items-center gap-1">
                {isUserPinned && (
                  <>
                    <button
                      onClick={() => movePinned.mutate({ ufId: feed._ufId, direction: "up" })}
                      className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => movePinned.mutate({ ufId: feed._ufId, direction: "down" })}
                      className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  className={`p-2 rounded-full hover:bg-accent ${isDefault || (isUserPinned) ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => { if (isUserPinned && feed._ufId) togglePin.mutate(feed._ufId); }}
                  disabled={isDefault}
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Saved Feeds */}
      {savedList.length > 0 && (
        <>
          <div className="px-4 pt-6 pb-2">
            <h3 className="text-xl font-bold text-foreground">Saved Feeds</h3>
          </div>
          <div className="border-t border-border">
            {savedList.map((feed: any) => {
              const Icon = iconMap[feed.icon] || Compass;
              return (
                <div key={feed._ufId} className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color} text-white`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-foreground truncate">{feed.name}</p>
                    <p className="text-sm text-muted-foreground truncate">Feed by {feed.author_handle}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => removeFeed.mutate(feed._ufId)}
                      className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => togglePin.mutate(feed._ufId)}
                      className="p-2 rounded-full hover:bg-accent text-muted-foreground"
                    >
                      <BellOff className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Feeds are custom algorithms that users build with a little coding expertise.{" "}
          <a href="#" className="text-primary hover:underline">See this guide</a> for more information.
        </p>
      </div>
    </div>
  );
}
