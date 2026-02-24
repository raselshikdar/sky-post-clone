import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import { ArrowLeft, MoreHorizontal, Camera, Link2, Search, ListFilter, Radio, BellPlus, Flag, VolumeX, Ban } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const PROFILE_TABS = ["Posts", "Replies", "Media", "Videos", "Likes", "Feeds", "Starter Packs", "Lists"] as const;
type ProfileTab = typeof PROFILE_TABS[number];

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [editOpen, setEditOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username!).single();
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

  // Check if the other user follows back (for "Follows you" badge)
  const { data: followsYou } = useQuery({
    queryKey: ["followsYou", profile?.id],
    queryFn: async () => {
      if (!user || !profile) return false;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", profile.id).eq("following_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!profile?.id && !isOwnProfile,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["isFollowing", profile?.id],
    queryFn: async () => {
      if (!user || !profile) return false;
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!profile?.id && !isOwnProfile,
  });

  // Mutual followers (people you follow who also follow this person)
  const { data: mutualFollowers = [] } = useQuery({
    queryKey: ["mutualFollowers", profile?.id],
    queryFn: async () => {
      if (!user || !profile) return [];
      // Get people I follow
      const { data: myFollowing } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      if (!myFollowing || myFollowing.length === 0) return [];
      const myFollowingIds = myFollowing.map((f) => f.following_id);
      // Get people who follow this profile
      const { data: theirFollowers } = await supabase.from("follows").select("follower_id").eq("following_id", profile.id).in("follower_id", myFollowingIds).limit(3);
      if (!theirFollowers || theirFollowers.length === 0) return [];
      const mutualIds = theirFollowers.map((f) => f.follower_id);
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", mutualIds);
      return profiles || [];
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/profile/${profile?.username}`);
    toast.success("Link copied to clipboard");
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
      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes, imagesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
        user ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        supabase.from("post_images").select("post_id, url, position").in("post_id", postIds).order("position"),
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

      return data.map((post) => {
        const p = post.profiles as any;
        return {
          id: post.id, authorId: post.author_id,
          authorName: p?.display_name || "", authorHandle: p?.username || "",
          authorAvatar: p?.avatar_url || "", content: post.content,
          createdAt: post.created_at,
          images: postImages[post.id],
          likeCount: likeCounts[post.id] || 0, replyCount: replyCounts[post.id] || 0,
          repostCount: repostCounts[post.id] || 0,
          isLiked: userLikedSet.has(post.id), isReposted: userRepostedSet.has(post.id),
        };
      });
    },
    enabled: !!profile?.id,
  });

  const renderBio = (bio: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = bio.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} className="bsky-link" target="_blank" rel="noopener noreferrer">
          {part.replace(/^https?:\/\//, "")}
        </a>
      ) : <span key={i}>{part}</span>
    );
  };

  if (!profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-col">
      {/* Banner */}
      <div className="relative">
        <div className="aspect-[3/1] w-full bg-primary/20">
          {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <button onClick={() => navigate(-1)} className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Profile info */}
      <div className="relative px-4 pb-3">
        <div className="flex items-start justify-between">
          <Avatar className="-mt-12 h-20 w-20 border-[3px] border-background lg:h-24 lg:w-24 lg:-mt-14">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2 mt-2">
            {isOwnProfile ? (
              <>
                <Button variant="outline" className="rounded-full font-semibold text-sm h-9 px-4" onClick={() => setEditOpen(true)}>
                  Edit Profile
                </Button>
                <ProfileMoreMenu isOwner onCopyLink={handleCopyLink} onSearchPosts={() => navigate("/search")} />
              </>
            ) : user ? (
              <>
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent">
                  <BellPlus className="h-5 w-5" />
                </button>
                <Button variant={isFollowing ? "outline" : "default"} className="rounded-full font-semibold text-sm h-9 px-5" onClick={handleFollow}>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <ProfileMoreMenu isOwner={false} onCopyLink={handleCopyLink} onSearchPosts={() => navigate("/search")} profileId={profile.id} />
              </>
            ) : null}
          </div>
        </div>

        <h1 className="mt-2 text-[22px] font-extrabold leading-tight flex items-center gap-1.5">
          {profile.display_name}
          <VerifiedBadge userId={profile.id} className="h-5 w-5" />
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {!isOwnProfile && followsYou && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-medium">Follows you</span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1 text-sm flex-wrap">
          <span className="font-bold">{formatCount(followCounts?.followers || 0)}</span>
          <span className="text-muted-foreground mr-2">followers</span>
          <span className="font-bold">{formatCount(followCounts?.following || 0)}</span>
          <span className="text-muted-foreground mr-2">following</span>
          <span className="font-bold">{formatCount(postCount || 0)}</span>
          <span className="text-muted-foreground">posts</span>
        </div>

        {profile.bio && (
          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">{renderBio(profile.bio)}</p>
        )}

        {/* Mutual followers */}
        {!isOwnProfile && mutualFollowers.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {mutualFollowers.slice(0, 3).map((mf: any) => (
                <Avatar key={mf.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={mf.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                    {mf.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p className="text-sm text-primary">
              Followed by {mutualFollowers.map((mf: any) => mf.display_name).join(" and ")}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <ScrollArea className="w-full">
          <div className="flex">
            {PROFILE_TABS.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${activeTab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
                {activeTab === t && <div className="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      </div>

      {posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No {activeTab.toLowerCase()} yet</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} {...post} />)
      )}

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

/* ---- Profile "..." Menu ---- */
function ProfileMoreMenu({ isOwner, onCopyLink, onSearchPosts, profileId }: {
  isOwner: boolean; onCopyLink: () => void; onSearchPosts: () => void; profileId?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isMuted } = useQuery({
    queryKey: ["isMuted", profileId],
    queryFn: async () => {
      if (!user || !profileId) return false;
      const { data } = await supabase.from("muted_accounts").select("id").eq("user_id", user.id).eq("muted_user_id", profileId).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!profileId && !isOwner,
  });

  const { data: isBlocked } = useQuery({
    queryKey: ["isBlocked", profileId],
    queryFn: async () => {
      if (!user || !profileId) return false;
      const { data } = await supabase.from("blocked_accounts").select("id").eq("user_id", user.id).eq("blocked_user_id", profileId).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!profileId && !isOwner,
  });

  const handleToggleMute = async () => {
    if (!user || !profileId) return;
    if (isMuted) {
      await supabase.from("muted_accounts").delete().eq("user_id", user.id).eq("muted_user_id", profileId);
      toast.success("Account unmuted");
    } else {
      const { error } = await supabase.from("muted_accounts").insert({ user_id: user.id, muted_user_id: profileId });
      if (error?.code === "23505") { toast.info("Account already muted"); return; }
      if (error) { toast.error("Failed to mute account"); return; }
      toast.success("Account muted");
    }
    queryClient.invalidateQueries({ queryKey: ["isMuted", profileId] });
  };

  const handleToggleBlock = async () => {
    if (!user || !profileId) return;
    if (isBlocked) {
      await supabase.from("blocked_accounts").delete().eq("user_id", user.id).eq("blocked_user_id", profileId);
      toast.success("Account unblocked");
    } else {
      const { error } = await supabase.from("blocked_accounts").insert({ user_id: user.id, blocked_user_id: profileId });
      if (error?.code === "23505") { toast.info("Account already blocked"); return; }
      if (error) { toast.error("Failed to block account"); return; }
      // Also unfollow when blocking
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
      toast.success("Account blocked");
    }
    queryClient.invalidateQueries({ queryKey: ["isBlocked", profileId] });
    queryClient.invalidateQueries({ queryKey: ["isFollowing", profileId] });
    queryClient.invalidateQueries({ queryKey: ["followCounts", profileId] });
  };

  const handleReport = async () => {
    if (!user || !profileId) return;
    const { error } = await supabase.from("account_reports").insert({ reporter_id: user.id, reported_user_id: profileId, reason: "spam" });
    if (error?.code === "23505") { toast.info("You have already reported this account"); return; }
    if (error) { toast.error("Failed to submit report"); return; }
    toast.success("Report submitted. We'll review this account.");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50 bg-background border border-border shadow-lg">
        <DropdownMenuItem onClick={onCopyLink} className="flex items-center justify-between py-3 px-4 cursor-pointer">
          <span>Copy link to profile</span>
          <Link2 className="h-5 w-5 text-muted-foreground" />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSearchPosts} className="flex items-center justify-between py-3 px-4 cursor-pointer">
          <span>Search posts</span>
          <Search className="h-5 w-5 text-muted-foreground" />
        </DropdownMenuItem>
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center justify-between py-3 px-4 cursor-pointer" onClick={() => toast.info("Lists coming soon")}>
              <span>Add to lists</span>
              <ListFilter className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center justify-between py-3 px-4 cursor-pointer" onClick={() => toast.info("Go live coming soon")}>
              <span>Go live</span>
              <Radio className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuItem>
          </>
        )}
        {!isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center justify-between py-3 px-4 cursor-pointer" onClick={() => toast.info("Starter packs coming soon")}>
              <span>Add to starter packs</span>
              <ListFilter className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center justify-between py-3 px-4 cursor-pointer" onClick={() => toast.info("Lists coming soon")}>
              <span>Add to lists</span>
              <ListFilter className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleMute} className="flex items-center justify-between py-3 px-4 cursor-pointer">
              <span>{isMuted ? "Unmute account" : "Mute account"}</span>
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleBlock} className="flex items-center justify-between py-3 px-4 cursor-pointer text-destructive">
              <span>{isBlocked ? "Unblock account" : "Block account"}</span>
              <Ban className="h-5 w-5" />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport} className="flex items-center justify-between py-3 px-4 cursor-pointer text-destructive">
              <span>Report account</span>
              <Flag className="h-5 w-5" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---- Edit Profile Dialog (Bluesky style) ---- */
function EditProfileDialog({ open, onOpenChange, profile, onSaved }: any) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>(profile.avatar_url || "");
  const [bannerPreview, setBannerPreview] = useState<string>(profile.banner_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, path: string) => {
    // Remove old file first to avoid extension conflicts
    await supabase.storage.from("profiles").remove([path]);
    const { error } = await supabase.storage.from("profiles").upload(path, file, { 
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = { display_name: displayName, bio };

      if (avatarFile) {
        updates.avatar_url = await uploadImage(avatarFile, `${profile.id}/avatar`);
      }
      if (bannerFile) {
        updates.banner_url = await uploadImage(bannerFile, `${profile.id}/banner`);
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) { toast.error("Failed to save profile"); return; }

      toast.success("Profile updated");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = displayName !== (profile.display_name || "") || bio !== (profile.bio || "") || avatarFile || bannerFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={() => onOpenChange(false)} className="text-sm font-semibold text-primary">Cancel</button>
          <h2 className="text-base font-bold">Edit profile</h2>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            className={`text-sm font-semibold ${hasChanges ? "text-primary" : "text-muted-foreground"}`}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Banner with camera button */}
        <div className="relative">
          <div className="aspect-[3/1] w-full bg-primary/20">
            {bannerPreview && <img src={bannerPreview} alt="" className="h-full w-full object-cover" />}
          </div>
          <label htmlFor="banner-upload"
            className="absolute right-3 bottom-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer">
            <Camera className="h-4 w-4" />
          </label>
          <input id="banner-upload" ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {/* Avatar overlapping banner */}
        <div className="relative px-4 -mt-10 mb-4">
          <div className="relative inline-block">
            <Avatar className="h-20 w-20 border-[3px] border-background">
              <AvatarImage src={avatarPreview} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {displayName[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer">
              <Camera className="h-3.5 w-3.5" />
            </label>
            <input id="avatar-upload" ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Form fields */}
        <div className="px-4 pb-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Display name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 bg-secondary/50 border-0 rounded-lg" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
              className="mt-1 bg-secondary/50 border-0 rounded-lg resize-none" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
