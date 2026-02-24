import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"posts" | "replies" | "media" | "likes">("posts");
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

      if (activeTab === "posts") query = query.is("parent_id", null);
      if (activeTab === "replies") query = query.not("parent_id", "is", null);

      const { data } = await query;
      return (data || []).map((post) => {
        const p = post.profiles as any;
        return {
          id: post.id,
          authorId: post.author_id,
          authorName: p?.display_name || "",
          authorHandle: p?.username || "",
          authorAvatar: p?.avatar_url || "",
          content: post.content,
          createdAt: post.created_at,
          likeCount: 0,
          replyCount: 0,
          repostCount: 0,
          isLiked: false,
          isReposted: false,
        };
      });
    },
    enabled: !!profile?.id,
  });

  if (!profile) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm lg:top-0">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors bsky-hover">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold leading-tight">{profile.display_name}</h2>
          <p className="text-xs text-muted-foreground">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="aspect-[3/1] w-full bg-primary/20">
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {/* Profile info */}
      <div className="relative px-4 pb-4">
        <div className="-mt-12 flex items-end justify-between">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {isOwnProfile ? (
            <Button variant="outline" className="rounded-full font-semibold" onClick={() => setEditOpen(true)}>
              Edit Profile
            </Button>
          ) : user ? (
            <Button
              variant={isFollowing ? "outline" : "default"}
              className="rounded-full font-semibold"
              onClick={handleFollow}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          ) : null}
        </div>

        <div className="mt-3">
          <h1 className="text-xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>Joined {format(new Date(profile.created_at), "MMMM yyyy")}</span>
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <span><strong>{followCounts?.following || 0}</strong> <span className="text-muted-foreground">following</span></span>
            <span><strong>{followCounts?.followers || 0}</strong> <span className="text-muted-foreground">followers</span></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["posts", "replies", "media", "likes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`relative flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              activeTab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {activeTab === t && (
              <div className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No {activeTab} yet</p>
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
