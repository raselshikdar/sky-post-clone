import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      return data;
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
      return (data || []).map((r) => {
        const p = r.profiles as any;
        return {
          id: r.id,
          authorId: r.author_id,
          authorName: p?.display_name || "",
          authorHandle: p?.username || "",
          authorAvatar: p?.avatar_url || "",
          content: r.content,
          createdAt: r.created_at,
          likeCount: 0,
          replyCount: 0,
          repostCount: 0,
          isLiked: false,
          isReposted: false,
        };
      });
    },
    enabled: !!postId,
  });

  const { data: stats } = useQuery({
    queryKey: ["postStats", postId],
    queryFn: async () => {
      const [likes, reposts] = await Promise.all([
        supabase.from("likes").select("id", { count: "exact" }).eq("post_id", postId!),
        supabase.from("reposts").select("id", { count: "exact" }).eq("post_id", postId!),
      ]);
      return { likes: likes.count || 0, reposts: reposts.count || 0 };
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
            <p className="font-bold">{profile?.display_name}</p>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{post.content}</p>

        <p className="mt-3 text-sm text-muted-foreground">
          {format(new Date(post.created_at), "h:mm a · MMM d, yyyy")}
        </p>

        {/* Stats */}
        {(stats?.reposts || stats?.likes) ? (
          <div className="mt-3 flex gap-4 border-t border-border pt-3 text-sm">
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
