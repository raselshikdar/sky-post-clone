import { useState, useEffect } from "react";
import {
  ArrowLeft, Hash, MessageSquareText, Home, MonitorPlay, Info,
  ChevronRight, Play, TrendingUp,
  Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil, Palette,
  MessageCircle, Repeat2, Quote, FlaskConical, TreeDeciduous, Video, VolumeX,
  RotateCcw, Gauge, Save, GripVertical, Pin, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";

const iconMap: Record<string, any> = { compass: Compass, "list-filter": ListFilter, flame: Flame, heart: Heart, users: Users, newspaper: Newspaper, pencil: Pencil, palette: Palette };

export default function ContentMediaSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [subSection, setSubSection] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    autoplay_media: true,
    enable_trending_topics: true,
    enable_trending_in_discover: true,
    thread_sort: "newest",
    tree_view: false,
    following_feed_replies: true,
    following_feed_reposts: true,
    following_feed_quotes: true,
    following_feed_samples: false,
    external_media_enabled: true,
    ext_youtube: false,
    ext_youtube_shorts: false,
    ext_vimeo: false,
    ext_twitch: false,
    ext_giphy: false,
    ext_spotify: false,
    ext_apple_music: false,
    ext_soundcloud: false,
    ext_flickr: false,
    video_default_muted: true,
    video_loop: false,
    video_quality: "auto",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("content_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as any;
        setSettings(prev => ({
          ...prev,
          ...Object.fromEntries(Object.keys(prev).filter(k => d[k] !== undefined).map(k => [k, d[k]])),
        }));
      }
      setLoaded(true);
    });
  }, [user]);

  const persistSetting = async (updates: Record<string, any>) => {
    if (!user) return;
    const { data: existing } = await supabase.from("content_settings").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("content_settings").update({ ...updates, updated_at: new Date().toISOString() } as any).eq("user_id", user.id);
    } else {
      await supabase.from("content_settings").insert({ user_id: user.id, ...updates } as any);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    persistSetting({ [key]: value });
  };

  // Interests
  const { data: allInterests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => { const { data } = await supabase.from("interests").select("*").order("name"); return data || []; },
  });
  const { data: userInterests = [] } = useQuery({
    queryKey: ["user_interests", user?.id],
    queryFn: async () => { if (!user) return []; const { data } = await supabase.from("user_interests").select("*").eq("user_id", user.id); return data || []; },
    enabled: !!user,
  });
  const userInterestIds = new Set(userInterests.map((ui: any) => ui.interest_id));

  const toggleInterest = async (interestId: string) => {
    if (!user) return;
    if (userInterestIds.has(interestId)) {
      await supabase.from("user_interests").delete().eq("user_id", user.id).eq("interest_id", interestId);
    } else {
      await supabase.from("user_interests").insert({ user_id: user.id, interest_id: interestId });
    }
    queryClient.invalidateQueries({ queryKey: ["user_interests"] });
  };

  const renderBack = (title: string, onBack: () => void, extra?: React.ReactNode) => (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {extra}
    </div>
  );

  // ─── Sub: Thread Preferences ───
  if (subSection === "threads") {
    const sortOptions = [
      { value: "most_liked", label: "Top replies first" },
      { value: "oldest", label: "Oldest replies first" },
      { value: "newest", label: "Newest replies first" },
    ];
    return (
      <div className="flex flex-col h-full">
        {renderBack("Thread Preferences", () => setSubSection(null))}
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MessageSquareText className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <h3 className="text-base font-bold text-foreground">Sort replies</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-8">Sort replies to the same post by:</p>
            <div className="ml-8 space-y-3">
              {sortOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer" onClick={() => updateSetting("thread_sort", opt.value)}>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${settings.thread_sort === opt.value ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                    {settings.thread_sort === opt.value && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                  </div>
                  <span className="text-[15px] font-medium text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center gap-3">
              <TreeDeciduous className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <h3 className="text-base font-bold text-foreground">Tree view</h3>
            </div>
            <div className="flex items-center justify-between ml-8">
              <p className="text-sm text-muted-foreground pr-4">Show post replies in a threaded tree view</p>
              <Checkbox checked={settings.tree_view} onCheckedChange={(c) => updateSetting("tree_view", !!c)} disabled={!loaded} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sub: Following Feed Preferences ───
  if (subSection === "following") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Following Feed Preferences", () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">These settings only apply to the Following feed.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3.5 border-b border-border">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                <span className="text-[15px] font-medium">Show replies</span>
              </div>
              <Checkbox checked={settings.following_feed_replies} onCheckedChange={(v) => updateSetting("following_feed_replies", !!v)} disabled={!loaded} />
            </div>
            <div className="flex items-center justify-between py-3.5 border-b border-border">
              <div className="flex items-center gap-3">
                <Repeat2 className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                <span className="text-[15px] font-medium">Show reposts</span>
              </div>
              <Checkbox checked={settings.following_feed_reposts} onCheckedChange={(v) => updateSetting("following_feed_reposts", !!v)} disabled={!loaded} />
            </div>
            <div className="flex items-center justify-between py-3.5 border-b border-border">
              <div className="flex items-center gap-3">
                <Quote className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                <span className="text-[15px] font-medium">Show quote posts</span>
              </div>
              <Checkbox checked={settings.following_feed_quotes} onCheckedChange={(v) => updateSetting("following_feed_quotes", !!v)} disabled={!loaded} />
            </div>
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <h3 className="text-base font-bold text-foreground">Experimental</h3>
            </div>
            <div className="flex items-center justify-between ml-8">
              <p className="text-sm text-muted-foreground pr-4">Show samples of your saved feeds in your Following feed</p>
              <Checkbox checked={settings.following_feed_samples} onCheckedChange={(v) => updateSetting("following_feed_samples", !!v)} disabled={!loaded} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sub: Video Preferences ───
  if (subSection === "video") {
    const qualityOptions = [
      { value: "auto", label: "Auto (recommended)" },
      { value: "low", label: "Low (save data)" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ];
    return (
      <div className="flex flex-col h-full">
        {renderBack("Video Preferences", () => setSubSection(null))}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">Control how uploaded and embedded videos behave in your feeds.</p>
            </div>
            <div className="space-y-1">
              <div className="px-0 pb-2"><h3 className="text-base font-bold text-foreground">Playback</h3></div>
              <div className="flex items-center justify-between py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <Play className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  <div>
                    <span className="text-[15px] font-medium text-foreground block">Autoplay videos</span>
                    <span className="text-sm text-muted-foreground">Videos play automatically as you scroll</span>
                  </div>
                </div>
                <Checkbox checked={settings.autoplay_media} onCheckedChange={(v) => updateSetting("autoplay_media", !!v)} disabled={!loaded} />
              </div>
              <div className="flex items-center justify-between py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <VolumeX className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  <div>
                    <span className="text-[15px] font-medium text-foreground block">Mute by default</span>
                    <span className="text-sm text-muted-foreground">Videos start muted until you unmute</span>
                  </div>
                </div>
                <Checkbox checked={settings.video_default_muted} onCheckedChange={(v) => updateSetting("video_default_muted", !!v)} disabled={!loaded} />
              </div>
              <div className="flex items-center justify-between py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  <div>
                    <span className="text-[15px] font-medium text-foreground block">Loop videos</span>
                    <span className="text-sm text-muted-foreground">Replay videos automatically when they end</span>
                  </div>
                </div>
                <Checkbox checked={settings.video_loop} onCheckedChange={(v) => updateSetting("video_loop", !!v)} disabled={!loaded} />
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                <h3 className="text-base font-bold text-foreground">Video quality</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8">Preferred quality for video playback:</p>
              <div className="ml-8 space-y-3">
                {qualityOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer" onClick={() => updateSetting("video_quality", opt.value)}>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${settings.video_quality === opt.value ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {settings.video_quality === opt.value && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="text-[15px] font-medium text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-1">
              <div className="px-0 pb-2"><h3 className="text-base font-bold text-foreground">Embedded videos</h3></div>
              <div className="flex items-center justify-between py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <MonitorPlay className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  <div>
                    <span className="text-[15px] font-medium text-foreground block">Enable external embeds</span>
                    <span className="text-sm text-muted-foreground">Show embedded videos from YouTube, Facebook, etc.</span>
                  </div>
                </div>
                <Checkbox checked={settings.external_media_enabled} onCheckedChange={(v) => updateSetting("external_media_enabled", !!v)} disabled={!loaded} />
              </div>
              <div className="flex items-center justify-between py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  <div>
                    <span className="text-[15px] font-medium text-foreground block">Trending videos in Discover</span>
                    <span className="text-sm text-muted-foreground">Show trending videos in your Discover feed</span>
                  </div>
                </div>
                <Checkbox checked={settings.enable_trending_in_discover} onCheckedChange={(v) => updateSetting("enable_trending_in_discover", !!v)} disabled={!loaded} />
              </div>
            </div>
          </div>
          <div className="h-20" />
        </ScrollArea>
      </div>
    );
  }

  // ─── Sub: External Media ───
  if (subSection === "external") {
    const providers = [
      { key: "ext_youtube", label: "YouTube" },
      { key: "ext_youtube_shorts", label: "YouTube Shorts" },
      { key: "ext_vimeo", label: "Vimeo" },
      { key: "ext_twitch", label: "Twitch" },
      { key: "ext_giphy", label: "GIPHY" },
      { key: "ext_spotify", label: "Spotify" },
      { key: "ext_apple_music", label: "Apple Music" },
      { key: "ext_soundcloud", label: "SoundCloud" },
      { key: "ext_flickr", label: "Flickr" },
    ];
    return (
      <div className="flex flex-col h-full">
        {renderBack("External Media Preferences", () => setSubSection(null))}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                External media may allow websites to collect information about you and your device. No information is sent or requested until you press the "play" button.
              </p>
            </div>
            <div>
              <p className="text-[15px] font-medium text-foreground mb-4">Enable media players for</p>
              <div className="space-y-1">
                {providers.map((p) => (
                  <div key={p.key} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <span className="text-[15px] font-medium text-foreground">{p.label}</span>
                    <Checkbox checked={(settings as any)[p.key]} onCheckedChange={(c) => updateSetting(p.key, !!c)} disabled={!loaded} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-20" />
        </ScrollArea>
      </div>
    );
  }

  // ─── Sub: Your Interests ───
  if (subSection === "interests") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Your interests", () => setSubSection(null))}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="pb-3 border-b border-border">
              <p className="text-sm text-muted-foreground">Your selected interests help us serve you content you care about.</p>
            </div>
            {allInterests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No interests available</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {allInterests.map((interest: any) => {
                  const selected = userInterestIds.has(interest.id);
                  return (
                    <button key={interest.id} onClick={() => toggleInterest(interest.id)}
                      className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${selected ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-accent"}`}>
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-20" />
        </ScrollArea>
      </div>
    );
  }

  // ─── Main Content & Media page ───
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{t("settings.content_media")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="border-b border-border">
          <SettingsNavRow icon={MessageSquareText} label="Thread preferences" onClick={() => setSubSection("threads")} />
          <SettingsNavRow icon={Home} label="Following feed preferences" onClick={() => setSubSection("following")} />
          <SettingsNavRow icon={Video} label="Video preferences" onClick={() => setSubSection("video")} />
          <SettingsNavRow icon={MonitorPlay} label="External media" onClick={() => setSubSection("external")} />
          <SettingsNavRow icon={Info} label="Your interests" onClick={() => setSubSection("interests")} />
        </div>

        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Autoplay videos and GIFs</span>
            </div>
            <Checkbox checked={settings.autoplay_media} onCheckedChange={(c) => updateSetting("autoplay_media", !!c)} disabled={!loaded} />
          </div>
        </div>

        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Enable trending topics</span>
            </div>
            <Checkbox checked={settings.enable_trending_topics} onCheckedChange={(c) => updateSetting("enable_trending_topics", !!c)} disabled={!loaded} />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Enable trending videos in your Discover feed</span>
            </div>
            <Checkbox checked={settings.enable_trending_in_discover} onCheckedChange={(c) => updateSetting("enable_trending_in_discover", !!c)} disabled={!loaded} />
          </div>
        </div>

        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}

function SettingsNavRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-accent transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        <span className="text-[15px] font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
