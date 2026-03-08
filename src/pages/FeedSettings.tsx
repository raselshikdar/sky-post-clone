import { useState } from "react";
import {
  ArrowLeft, Save, GripVertical, Pin, Trash2,
  Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil, Palette
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

const iconMap: Record<string, any> = { compass: Compass, "list-filter": ListFilter, flame: Flame, heart: Heart, users: Users, newspaper: Newspaper, pencil: Pencil, palette: Palette };

export default function FeedSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: allFeeds = [] } = useQuery({ queryKey: ["feeds"], queryFn: async () => { const { data } = await supabase.from("feeds").select("*").order("created_at"); return data || []; } });
  const { data: userFeeds = [] } = useQuery({
    queryKey: ["user_feeds", user?.id],
    queryFn: async () => { if (!user) return []; const { data } = await supabase.from("user_feeds").select("*, feeds(*)").eq("user_id", user.id).order("pin_position"); return data || []; },
    enabled: !!user,
  });

  const defaultFeeds = allFeeds.filter((f: any) => f.is_default);
  const pinnedUserFeeds = userFeeds.filter((uf: any) => uf.is_pinned);
  const savedUserFeeds = userFeeds.filter((uf: any) => !uf.is_pinned);
  const pinnedList = [...defaultFeeds.map((f: any) => ({ ...f, _type: "default" })), ...pinnedUserFeeds.map((uf: any) => ({ ...uf.feeds, _type: "user_pinned", _ufId: uf.id }))];
  const savedList = savedUserFeeds.map((uf: any) => ({ ...uf.feeds, _ufId: uf.id }));

  const movePinned = useMutation({
    mutationFn: async ({ ufId, direction }: { ufId: string; direction: "up" | "down" }) => {
      const idx = pinnedUserFeeds.findIndex((uf: any) => uf.id === ufId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= pinnedUserFeeds.length) return;
      const current = pinnedUserFeeds[idx]; const swap = pinnedUserFeeds[swapIdx];
      await Promise.all([
        supabase.from("user_feeds").update({ pin_position: swap.pin_position }).eq("id", current.id),
        supabase.from("user_feeds").update({ pin_position: current.pin_position }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_feeds"] }),
  });

  const removeFeed = useMutation({
    mutationFn: async (ufId: string) => { await supabase.from("user_feeds").delete().eq("id", ufId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_feeds"] }); toast.success("Feed removed"); },
  });

  const togglePin = useMutation({
    mutationFn: async (ufId: string) => {
      const uf = userFeeds.find((u: any) => u.id === ufId);
      if (!uf) return;
      await supabase.from("user_feeds").update({ is_pinned: !uf.is_pinned, pin_position: uf.is_pinned ? 0 : pinnedUserFeeds.length }).eq("id", ufId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_feeds"] }); },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
          <h2 className="text-lg font-bold">{t("feeds.manage_feeds") || "Manage Feeds"}</h2>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 pt-5 pb-2"><h3 className="text-xl font-bold text-foreground">Pinned Feeds</h3></div>
        <div className="border-t border-border">
          {pinnedList.map((feed: any) => {
            const Icon = iconMap[feed.icon] || Compass;
            const isDefault = feed._type === "default";
            const isUserPinned = feed._type === "user_pinned";
            return (
              <div key={feed.id + (feed._ufId || "")} className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${feed.color || "bg-primary"} text-white`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-foreground truncate">{feed.name}</p>
                  <p className="text-sm text-muted-foreground truncate">Feed by {feed.author_handle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 text-primary"
                    onClick={() => { if (isUserPinned && feed._ufId) togglePin.mutate(feed._ufId); }}
                    disabled={isDefault}
                  >
                    <Pin className="h-4 w-4 fill-primary" />
                  </button>
                  <button className="p-1.5 text-muted-foreground cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
          {pinnedList.length === 0 && <div className="py-8 text-center text-muted-foreground">No pinned feeds yet</div>}
        </div>

        {savedList.length > 0 && (<>
          <div className="px-4 pt-6 pb-2"><h3 className="text-xl font-bold text-foreground">Saved Feeds</h3></div>
          <div className="border-t border-border">
            {savedList.map((feed: any) => {
              const Icon = iconMap[feed.icon] || Compass;
              return (
                <div key={feed._ufId} className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${feed.color || "bg-primary"} text-white`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-foreground truncate">{feed.name}</p>
                    <p className="text-sm text-muted-foreground truncate">Feed by {feed.author_handle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFeed.mutate(feed._ufId)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => togglePin.mutate(feed._ufId)} className="p-1.5 text-primary">
                      <Pin className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}
        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}
