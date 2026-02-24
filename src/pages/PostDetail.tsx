import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { format } from "date-fns";
import { useState } from "react";
import Composer from "@/components/Composer";

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);

  const { data: post } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`id, content, created_at, parent_id, author_id, profiles!posts_author_id_fkey (id, username, display_name, avatar_url)`)
        .eq("id", postId!)
        .single();
      if (!data) return null;
      const { data: imgs } = await supabase
        .from("post_images")
        .select("url, position")
        .eq("post_id", postId!)
        .order("position");
      return { ...data, images: (imgs || []).map((i) => i.url) };
    },
    enabled: !!postId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["replies", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`id, content, created_at, parent_id, author_id, profiles!posts_author_id_fkey (id, username, display_name, avatar_url)`)
        .eq("parent_id", postId!)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) return [];

      // Fetch real counts for replies
      const replyIds = data.map((r) => r.id);
      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes, imagesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", replyIds),
        supabase.from("reposts").select("post_id").in("post_id", replyIds),
        supabase.from("posts").select("parent_id").in("parent_id", replyIds),
        user ? supabase.from("likes").select("post_id").in("post_id", replyIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", replyIds).eq("user_id", user.id) : { data: [] },
        supabase.from("post_images").select("post_id, url, position").in("post_id", replyIds).order("position"),
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

      return data.map((r) => {
        const p = r.profiles as any;
        return {
          id: r.id,
          authorId: r.author_id,
          authorName: p?.display_name || "",
          authorHandle: p?.username || "",
          authorAvatar: p?.avatar_url || "",
          content: r.content,
          createdAt: r.created_at,
          images: postImages[r.id],
          likeCount: likeCounts[r.id] || 0,
          replyCount: replyCounts[r.id] || 0,
          repostCount: repostCounts[r.id] || 0,
          isLiked: userLikedSet.has(r.id),
          isReposted: userRepostedSet.has(r.id),
        };
      });
    },
    enabled: !!postId,
  });

  const { data: stats } = useQuery({
    queryKey: ["postStats", postId],
    queryFn: async () => {
      const [likes, reposts, replies] = await Promise.all([
        supabase.from("likes").select("id", { count: "exact" }).eq("post_id", postId!),
        supabase.from("reposts").select("id", { count: "exact" }).eq("post_id", postId!),
        supabase.from("posts").select("id", { count: "exact" }).eq("parent_id", postId!),
      ]);
      return { likes: likes.count || 0, reposts: reposts.count || 0, replies: replies.count || 0 };
    },
    enabled: !!postId,
  });

  if (!post) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  const profile = post.profiles as any;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors bsky-hover">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">Post</h2>
      </div>

      {/* Main Post */}
      <div className="px-4 py-3 bsky-divider">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/profile/${profile?.username}`)}>
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile?.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold flex items-center gap-1">
              {profile?.display_name}
              <VerifiedBadge userId={post.author_id} className="h-4.5 w-4.5" />
            </p>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{post.content}</p>

        {post.images && post.images.length > 0 && (
          <div className={`mt-3 overflow-hidden rounded-xl border border-border ${post.images.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
            {post.images.slice(0, 4).map((img, i) => (
              <img key={i} src={img} alt="" className={`w-full object-cover ${post.images.length === 1 ? "" : "aspect-square"}`} style={post.images.length === 1 ? { maxHeight: 500 } : undefined} />
            ))}
          </div>
        )}

        <p className="mt-3 text-sm text-muted-foreground">
          {format(new Date(post.created_at), "h:mm a · MMM d, yyyy")}
        </p>

        {/* Stats */}
        {(stats?.reposts || stats?.likes || stats?.replies) ? (
          <div className="mt-3 flex gap-4 border-t border-border pt-3 text-sm">
            {stats.replies > 0 && <span><strong>{stats.replies}</strong> <span className="text-muted-foreground">Replies</span></span>}
            {stats.reposts > 0 && <span><strong>{stats.reposts}</strong> <span className="text-muted-foreground">Reposts</span></span>}
            {stats.likes > 0 && <span><strong>{stats.likes}</strong> <span className="text-muted-foreground">Likes</span></span>}
          </div>
        ) : null}

        {/* Reply button */}
        {user && (
          <button
            onClick={() => setReplyOpen(true)}
            className="mt-3 w-full border-t border-border pt-3 text-left text-sm text-muted-foreground transition-colors bsky-hover"
          >
            Write your reply...
          </button>
        )}
      </div>

      {/* Replies */}
      {replies.map((reply) => (
        <PostCard key={reply.id} {...reply} />
      ))}

      <Composer open={replyOpen} onOpenChange={setReplyOpen} parentId={postId} />
    </div>
  );
}
