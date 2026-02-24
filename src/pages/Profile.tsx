import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const PROFILE_TABS = ["Posts", "Replies", "Media", "Videos", "Likes", "Feeds", "Starter Packs", "Lists"] as const;
type ProfileTab = typeof PROFILE_TABS[number];

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [editOpen, setEditOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username!)
        .single();
      return data;
    },
    enabled: !!username,
  });

  const isOwnProfile = user?.id === profile?.id;

  const { data: followCounts } = useQuery({
    queryKey: ["followCounts", profile?.id],
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact" }).eq("following_id", profile!.id),
        supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", profile!.id),
      ]);
      return { followers: followers.count || 0, following: following.count || 0 };
    },
    enabled: !!profile?.id,
  });

  const { data: postCount } = useQuery({
    queryKey: ["postCount", profile?.id],
    queryFn: async () => {
      const { count } = await supabase.from("posts").select("id", { count: "exact" }).eq("author_id", profile!.id).is("parent_id", null);
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["isFollowing", profile?.id],
    queryFn: async () => {
      if (!user || !profile) return false;
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!profile?.id && !isOwnProfile,
  });

  const queryClient = useQueryClient();

  const handleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
    }
    queryClient.invalidateQueries({ queryKey: ["isFollowing", profile.id] });
    queryClient.invalidateQueries({ queryKey: ["followCounts", profile.id] });
  };

  const { data: posts = [] } = useQuery({
    queryKey: ["profilePosts", profile?.id, activeTab],
    queryFn: async () => {
      if (!profile) return [];
      let query = supabase
        .from("posts")
        .select(`id, content, created_at, parent_id, author_id, profiles!posts_author_id_fkey (id, username, display_name, avatar_url)`)
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activeTab === "Posts") query = query.is("parent_id", null);
      if (activeTab === "Replies") query = query.not("parent_id", "is", null);

      const { data } = await query;
      if (!data || data.length === 0) return [];

      const postIds = data.map((p) => p.id);
      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
        user ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
      ]);

      const likeCounts: Record<string, number> = {};
      const repostCounts: Record<string, number> = {};
      const replyCounts: Record<string, number> = {};
      const userLikedSet = new Set((userLikesRes.data || []).map((l) => l.post_id));
      const userRepostedSet = new Set((userRepostsRes.data || []).map((r) => r.post_id));

      (likesRes.data || []).forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      (repostsRes.data || []).forEach((r) => { repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1; });
      (repliesRes.data || []).forEach((r) => { if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1; });

      return data.map((post) => {
        const p = post.profiles as any;
        return {
          id: post.id,
          authorId: post.author_id,
          authorName: p?.display_name || "",
          authorHandle: p?.username || "",
          authorAvatar: p?.avatar_url || "",
          content: post.content,
          createdAt: post.created_at,
          likeCount: likeCounts[post.id] || 0,
          replyCount: replyCounts[post.id] || 0,
          repostCount: repostCounts[post.id] || 0,
          isLiked: userLikedSet.has(post.id),
          isReposted: userRepostedSet.has(post.id),
        };
      });
    },
    enabled: !!profile?.id,
  });

  // Linkify bio URLs
  const renderBio = (bio: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = bio.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} className="bsky-link" target="_blank" rel="noopener noreferrer">
          {part.replace(/^https?:\/\//, "")}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (!profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-col">
      {/* Banner with overlaid back button */}
      <div className="relative">
        <div className="aspect-[3/1] w-full bg-primary/20">
          {profile.banner_url && (
            <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Profile info */}
      <div className="relative px-4 pb-3">
        {/* Avatar + action buttons row */}
        <div className="flex items-end justify-between">
          <Avatar className="-mt-12 h-20 w-20 border-[3px] border-background lg:h-24 lg:w-24 lg:-mt-14">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <>
                <Button variant="outline" className="rounded-full font-semibold text-sm h-9 px-4" onClick={() => setEditOpen(true)}>
                  Edit Profile
                </Button>
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </>
            ) : user ? (
              <>
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  className="rounded-full font-semibold text-sm h-9 px-5"
                  onClick={handleFollow}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Name & handle */}
        <h1 className="mt-2 text-[22px] font-extrabold leading-tight">{profile.display_name}</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>

        {/* Stats row */}
        <div className="mt-2 flex items-center gap-1 text-sm flex-wrap">
          <span className="font-bold">{followCounts?.followers || 0}</span>
          <span className="text-muted-foreground mr-2">followers</span>
          <span className="font-bold">{followCounts?.following || 0}</span>
          <span className="text-muted-foreground mr-2">following</span>
          <span className="font-bold">{postCount || 0}</span>
          <span className="text-muted-foreground">posts</span>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {renderBio(profile.bio)}
          </p>
        )}
      </div>

      {/* Scrollable tabs */}
      <div className="border-b border-border">
        <ScrollArea className="w-full">
          <div className="flex">
            {PROFILE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
                {activeTab === t && (
                  <div className="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No {activeTab.toLowerCase()} yet</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} {...post} />)
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSaved={() => {
            refreshProfile();
            queryClient.invalidateQueries({ queryKey: ["profile", username] });
          }}
        />
      )}
    </div>
  );
}

function EditProfileDialog({ open, onOpenChange, profile, onSaved }: any) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName, bio }).eq("id", profile.id);
    onSaved();
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full rounded-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
