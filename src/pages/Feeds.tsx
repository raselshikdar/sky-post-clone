import { useState } from "react";
import { ArrowLeft, Settings, ChevronRight, Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil, Palette, Search, Pin, Globe, Tv, Atom, Music, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

// Bsky আইডেন্টিক্যাল আইকন ম্যাপ - নতুন আইকন যুক্ত করা হয়েছে
const iconMap: Record<string, any> = { 
  compass: Compass, 
  "list-filter": ListFilter, 
  flame: Flame, 
  heart: Heart, 
  users: Users, 
  newspaper: Newspaper, 
  news: Newspaper, // News এর জন্য সুনির্দিষ্ট ম্যাপিং
  pencil: Pencil, 
  palette: Palette,
  globe: Globe,
  tv: Tv,
  atom: Atom,
  music: Music,
  gaming: Gamepad2
};

function formatLikedCount(n: number) { 
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString(); 
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

  const handleFeedClick = (feed: any) => {
    navigate(`/trending/${feed.name.replace(/\s+/g, '-').toLowerCase()}`);
  };

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-background/95 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <h2 className="text-[17px] font-bold tracking-tight">Feeds</h2>
        </div>
        <button onClick={() => navigate("/feeds/settings")} className="p-1">
          <Settings className="h-5 w-5 text-slate-500" />
        </button>
      </div>

      {/* "My Feeds" Header - হরাইজন্টাল লাইন যুক্ত করা হয়েছে */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-primary">
          <ListFilter className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-slate-900 leading-none">My Feeds</h3>
          <p className="text-[13px] text-slate-500 mt-1">All the feeds you've saved, right in one place.</p>
        </div>
      </div>

      {/* My Feeds List */}
      <div className="flex flex-col">
        {myFeeds.map((feed: any) => { 
          // News এর জন্য সুনির্দিষ্ট আইকন চেক
          const Icon = feed.name.toLowerCase() === 'news' ? Newspaper : (iconMap[feed.icon] || Compass); 
          return (
            <button 
              key={feed.id} 
              onClick={() => handleFeedClick(feed)}
              className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50"
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${feed.color || 'bg-primary'} text-white shadow-sm`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="flex-1 text-left text-[15px] font-bold text-slate-900 truncate">{feed.name}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" strokeWidth={2} />
            </button>
          ); 
        })}
      </div>

      {/* Discover Section */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-primary">
            <ListFilter className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-slate-900 leading-tight">Discover New Feeds</h3>
            <p className="text-[13px] text-slate-500 leading-snug">Choose your own timeline! Feeds built by the community help you find content you love.</p>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            placeholder="Search feeds" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full h-9 pl-10 pr-4 rounded-xl bg-slate-100 border-none text-[14px] outline-none placeholder:text-slate-400 font-medium" 
          />
        </div>
      </div>

      {/* Discover Feeds List */}
      <div className="flex flex-col border-t border-slate-100">
        {discoverFeeds.map((feed: any) => { 
          const Icon = iconMap[feed.icon] || Compass; 
          return (
            <div key={feed.id} className="px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color || 'bg-slate-800'} text-white`}>
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col min-w-0" onClick={() => handleFeedClick(feed)}>
                      <p className="font-bold text-[15px] text-slate-900 leading-tight hover:underline cursor-pointer truncate">{feed.name}</p>
                      <p className="text-[13px] text-slate-500 mt-0.5 truncate">
                        Feed by @{feed.author_handle}
                      </p>
                    </div>
                    <Button 
                      className="h-8 rounded-full bg-[#0085ff] text-white hover:bg-[#0070d6] font-bold text-[13px] px-3.5 border-none flex-shrink-0" 
                      onClick={(e) => { e.stopPropagation(); pinFeedMutation.mutate(feed.id); }}
                    >
                      <Pin className="h-3.5 w-3.5 mr-1" fill="currentColor" />
                      Pin feed
                    </Button>
                  </div>
                  
                  {feed.description && (
                    <p className="mt-2 text-[14px] leading-snug text-slate-700 font-normal break-words line-clamp-3">
                      {feed.description}
                    </p>
                  )}
                  
                  {feed.liked_count > 0 && (
                    <p className="mt-2 text-[13px] font-medium text-slate-500">
                      Liked by {formatLikedCount(feed.liked_count)} users
                    </p>
                  )}
                </div>
              </div>
            </div>
          ); 
        })}
      </div>
      <div className="h-20" /> 
    </div>
  );
}
