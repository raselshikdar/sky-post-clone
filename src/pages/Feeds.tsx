import { useState } from "react";
import { ArrowLeft, Settings, ChevronRight, Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil, Palette, Search, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

const iconMap: Record<string, any> = { 
  compass: Compass, 
  "list-filter": ListFilter, 
  flame: Flame, 
  heart: Heart, 
  users: Users, 
  newspaper: Newspaper, 
  pencil: Pencil, 
  palette: Palette 
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
  const { t } = useTranslation();

  const { data: allFeeds = [] } = useQuery({ 
    queryKey: ["feeds"], 
    queryFn: async () => { 
      const { data } = await supabase.from("feeds").select("*").order("created_at"); 
      return data || []; 
    } 
  });

  const { data: userFeeds = [] } = useQuery({
    queryKey: ["user_feeds", user?.id],
    queryFn: async () => { 
      if (!user) return []; 
      const { data } = await supabase.from("user_feeds").select("*, feeds(*)").eq("user_id", user.id).order("pin_position"); 
      return data || []; 
    },
    enabled: !!user,
  });

  const pinFeedMutation = useMutation({
    mutationFn: async (feedId: string) => {
      if (!user) return;
      const existing = userFeeds.find((uf: any) => uf.feed_id === feedId);
      if (existing) { 
        await supabase.from("user_feeds").update({ is_pinned: !existing.is_pinned }).eq("id", existing.id); 
      }
      else { 
        await supabase.from("user_feeds").insert({ 
          user_id: user.id, 
          feed_id: feedId, 
          is_pinned: true, 
          pin_position: userFeeds.length 
        }); 
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["user_feeds"] }); 
      toast.success(t("feeds.updated")); 
    },
  });

  const savedFeedIds = new Set(userFeeds.map((uf: any) => uf.feed_id));
  const pinnedFeeds = userFeeds.filter((uf: any) => uf.is_pinned);
  const savedFeeds = userFeeds.filter((uf: any) => !uf.is_pinned);
  const defaultFeeds = allFeeds.filter((f: any) => f.is_default);
  
  const myFeeds = [
    ...defaultFeeds, 
    ...pinnedFeeds.map((uf: any) => uf.feeds).filter(Boolean), 
    ...savedFeeds.map((uf: any) => uf.feeds).filter(Boolean)
  ];

  const discoverFeeds = allFeeds
    .filter((f: any) => !f.is_default && !savedFeedIds.has(f.id))
    .filter((f: any) => 
      !searchQuery || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="flex flex-col bg-background min-h-screen pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 -ml-1 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-[19px] font-black tracking-tight">{t("nav.feeds")}</h2>
        </div>
        <button 
          onClick={() => navigate("/feeds/settings")} 
          className="p-1 hover:bg-accent rounded-full transition-colors"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Section: My Feeds Header */}
      <div className="flex items-center gap-4 px-4 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <ListFilter className="h-6 w-6 text-primary" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-[18px] font-extrabold text-foreground leading-tight">{t("feeds.my_feeds")}</h3>
          <p className="text-[14px] text-muted-foreground leading-snug">{t("feeds.my_feeds_desc")}</p>
        </div>
      </div>

      {/* My Feeds List */}
      <div className="flex flex-col">
        {myFeeds.map((feed: any) => { 
          const Icon = iconMap[feed.icon] || Compass; 
          return (
            <button 
              key={feed.id} 
              className="flex w-full items-center gap-4 px-4 py-3.5 hover:bg-accent/50 transition-colors border-b border-slate-100 dark:border-slate-800"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feed.color} text-white shadow-sm`}>
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="flex-1 text-left text-[16px] font-bold text-foreground">{feed.name}</span>
              <ChevronRight className="h-5 w-5 text-slate-300" strokeWidth={3} />
            </button>
          ); 
        })}
      </div>

      {/* Discover Section Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/60">
            <ListFilter className="h-6 w-6 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[18px] font-extrabold text-foreground leading-tight">Discover New Feeds</h3>
            <p className="text-[14px] text-muted-foreground leading-snug">{t("feeds.discover_desc")}</p>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative mb-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search feeds" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-100 dark:bg-slate-900 border-none text-[15px] focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-muted-foreground" 
          />
        </div>
      </div>

      {/* Discover Feeds List */}
      <div className="flex flex-col border-t border-slate-100 dark:border-slate-800">
        {discoverFeeds.map((feed: any) => { 
          const Icon = iconMap[feed.icon] || Compass; 
          return (
            <div key={feed.id} className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-accent/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color} text-white shadow-sm`}>
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <p className="font-extrabold text-[16px] text-foreground leading-tight hover:underline cursor-pointer truncate">{feed.name}</p>
                      <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                        Feed by <span className="hover:underline">@{feed.author_handle}</span>
                      </p>
                    </div>
                    {/* Bsky Styled Pin Button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold text-[13px] px-3.5 transition-all flex-shrink-0" 
                      onClick={() => pinFeedMutation.mutate(feed.id)}
                    >
                      <Pin className="h-3.5 w-3.5 mr-1.5" fill="currentColor" />
                      Pin Feed
                    </Button>
                  </div>
                  
                  {feed.description && (
                    <p className="mt-2 text-[14px] leading-snug text-foreground/90 break-words line-clamp-3">
                      {feed.description}
                    </p>
                  )}
                  
                  {feed.liked_count > 0 && (
                    <p className="mt-2.5 text-[13px] font-medium text-slate-500">
                      Liked by {formatLikedCount(feed.liked_count)} users
                    </p>
                  )}
                </div>
              </div>
            </div>
          ); 
        })}
        
        {discoverFeeds.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm font-medium">
              {searchQuery ? t("feeds.no_match") : t("feeds.all_saved")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
