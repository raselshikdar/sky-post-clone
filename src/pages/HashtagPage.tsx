import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { ArrowLeft, Hash } from "lucide-react";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: hashtag } = useQuery({
    queryKey: ["hashtag", tag],
    queryFn: async () => {
      const { data } = await supabase
        .from("hashtags")
        .select("*")
        .eq("name", tag!.toLowerCase())
        .maybeSingle();
      return data;
    },
    enabled: !!tag,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["hashtag_posts", tag],
    queryFn: async () => {
      // Search posts containing this hashtag
      const { data } = await supabase
        .from("posts")
        .select("id, content, created_at, parent_id, author_id, profiles!posts_author_id_fkey(id, username, display_name, avatar_url)")
        .ilike("content", `%#${tag}%`)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

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
      const userLikedSet = new Set((userLikesRes.data || []).map((l: any) => l.post_id));
      const userRepostedSet = new Set((userRepostsRes.data || []).map((r: any) => r.post_id));

      (likesRes.data || []).forEach((l: any) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
      (repostsRes.data || []).forEach((r: any) => { repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1; });
      (repliesRes.data || []).forEach((r: any) => { if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1; });
      (imagesRes.data || []).forEach((img: any) => {
        if (!postImages[img.post_id]) postImages[img.post_id] = [];
        postImages[img.post_id].push(img.url);
      });

      return data.map((p: any) => {
        const profile = p.profiles as any;
        return {
          id: p.id,
          authorId: p.author_id,
          authorName: profile?.display_name || "",
          authorHandle: profile?.username || "",
          authorAvatar: profile?.avatar_url || "",
          content: p.content,
          createdAt: p.created_at,
          images: postImages[p.id],
          likeCount: likeCounts[p.id] || 0,
          replyCount: replyCounts[p.id] || 0,
          repostCount: repostCounts[p.id] || 0,
          isLiked: userLikedSet.has(p.id),
          isReposted: userRepostedSet.has(p.id),
        };
      });
    },
    enabled: !!tag,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors bsky-hover">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-1">
            <Hash className="h-5 w-5 text-primary" />
            {tag}
          </h2>
          {hashtag && (
            <p className="text-sm text-muted-foreground">
              {hashtag.post_count} {hashtag.post_count === 1 ? "post" : "posts"}
            </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No posts found with #{tag}</p>
      )}

      {posts.map((post: any) => (
        <PostCard key={post.id} {...post} />
      ))}
    </div>
  );
}
