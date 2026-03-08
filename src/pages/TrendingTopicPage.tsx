import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import { ArrowLeft, TrendingUp } from "lucide-react";

export default function TrendingTopicPage() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["trending_topic_posts", topic],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, content, created_at, parent_id, author_id, quote_post_id, profiles!posts_author_id_fkey(id, username, display_name, avatar_url)")
        .ilike("content", `%${topic}%`)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data || data.length === 0) return [];

      const postIds = data.map((p) => p.id);
      const quotePostIds = data.map((p) => (p as any).quote_post_id).filter(Boolean) as string[];

      const [likesRes, repostsRes, repliesRes, userLikesRes, userRepostsRes, imagesRes, quotePostsRes, quoteImagesRes] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id").in("post_id", postIds),
        supabase.from("posts").select("parent_id").in("parent_id", postIds),
        user ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        user ? supabase.from("reposts").select("post_id").in("post_id", postIds).eq("user_id", user.id) : { data: [] },
        supabase.from("post_images").select("post_id, url, position").in("post_id", postIds).order("position"),
        quotePostIds.length > 0
          ? supabase.from("posts").select("id, content, created_at, author_id, profiles!posts_author_id_fkey (username, display_name, avatar_url)").in("id", quotePostIds)
          : { data: [] },
        quotePostIds.length > 0
          ? supabase.from("post_images").select("post_id, url, position").in("post_id", quotePostIds).order("position")
          : { data: [] },
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
      (imagesRes.data || []).forEach((img: any) => { if (!postImages[img.post_id]) postImages[img.post_id] = []; postImages[img.post_id].push(img.url); });

      const quotePostMap: Record<string, any> = {};
      const quoteImages: Record<string, string[]> = {};
      (quoteImagesRes.data || []).forEach((img: any) => {
        if (!quoteImages[img.post_id]) quoteImages[img.post_id] = [];
        quoteImages[img.post_id].push(img.url);
      });
      (quotePostsRes.data || []).forEach((qp: any) => {
        const qProfile = qp.profiles as any;
        quotePostMap[qp.id] = {
          id: qp.id, content: qp.content,
          authorName: qProfile?.display_name || "", authorHandle: qProfile?.username || "",
          authorAvatar: qProfile?.avatar_url || "", createdAt: qp.created_at,
          images: quoteImages[qp.id],
        };
      });

      return data.map((p: any) => {
        const profile = p.profiles as any;
        return {
          id: p.id, authorId: p.author_id,
          authorName: profile?.display_name || "", authorHandle: profile?.username || "",
          authorAvatar: profile?.avatar_url || "", content: p.content, createdAt: p.created_at,
          images: postImages[p.id],
          likeCount: likeCounts[p.id] || 0, replyCount: replyCounts[p.id] || 0,
          repostCount: repostCounts[p.id] || 0,
          isLiked: userLikedSet.has(p.id), isReposted: userRepostedSet.has(p.id),
          quotePost: p.quote_post_id ? quotePostMap[p.quote_post_id] || null : null,
        };
      });
    },
    enabled: !!topic,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-lg font-bold truncate">{topic}</h2>
        </div>
      </div>

      {isLoading ? (
        <div>{Array.from({ length: 5 }).map((_, i) => <PostCardSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No posts found for "{topic}"</p>
      ) : (
        posts.map((post: any) => <PostCard key={post.id} {...post} />)
      )}
    </div>
  );
}
