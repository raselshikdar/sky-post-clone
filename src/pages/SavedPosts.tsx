import { ArrowLeft, BookmarkX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";

export default function SavedPosts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: savedPosts = [], isLoading } = useQuery({
    queryKey: ["saved_posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!bookmarks || bookmarks.length === 0) return [];

      const postIds = bookmarks.map((b) => b.post_id);
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles:author_id(id, username, display_name, avatar_url), post_images(url, position)")
        .in("id", postIds);

      if (!posts) return [];

      // Get like/repost status
      const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const { data: reposts } = await supabase.from("reposts").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const likedSet = new Set(likes?.map((l) => l.post_id) || []);
      const repostedSet = new Set(reposts?.map((r) => r.post_id) || []);

      // Get counts
      const { data: likeCounts } = await supabase.from("likes").select("post_id").in("post_id", postIds);
      const { data: replyCounts } = await supabase.from("posts").select("parent_id").in("parent_id", postIds);
      const { data: repostCounts } = await supabase.from("reposts").select("post_id").in("post_id", postIds);

      const lcMap: Record<string, number> = {};
      const rcMap: Record<string, number> = {};
      const rpMap: Record<string, number> = {};
      likeCounts?.forEach((l) => { lcMap[l.post_id] = (lcMap[l.post_id] || 0) + 1; });
      replyCounts?.forEach((r) => { if (r.parent_id) rcMap[r.parent_id] = (rcMap[r.parent_id] || 0) + 1; });
      repostCounts?.forEach((r) => { rpMap[r.post_id] = (rpMap[r.post_id] || 0) + 1; });

      // Order by bookmark creation time
      const orderMap = new Map(bookmarks.map((b, i) => [b.post_id, i]));
      return posts
        .sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0))
        .map((p: any) => ({
          ...p,
          likeCount: lcMap[p.id] || 0,
          replyCount: rcMap[p.id] || 0,
          repostCount: rpMap[p.id] || 0,
          isLiked: likedSet.has(p.id),
          isReposted: repostedSet.has(p.id),
          images: p.post_images?.sort((a: any, b: any) => a.position - b.position).map((i: any) => i.url) || [],
        }));
    },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">Saved Posts</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : savedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <BookmarkX className="h-12 w-12 text-muted-foreground mb-3" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-foreground mb-1">Nothing saved yet</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => navigate("/")}>Go home</Button>
        </div>
      ) : (
        savedPosts.map((post: any) => (
          <PostCard
            key={post.id}
            id={post.id}
            authorId={post.profiles?.id}
            authorName={post.profiles?.display_name || ""}
            authorHandle={post.profiles?.username || ""}
            authorAvatar={post.profiles?.avatar_url || ""}
            content={post.content}
            createdAt={post.created_at}
            images={post.images}
            likeCount={post.likeCount}
            replyCount={post.replyCount}
            repostCount={post.repostCount}
            isLiked={post.isLiked}
            isReposted={post.isReposted}
          />
        ))
      )}
    </div>
  );
}
