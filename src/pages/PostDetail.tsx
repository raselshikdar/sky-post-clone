import { useParams, useNavigate } from "react-router-dom";
import { timeAgo } from "@/lib/time";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { ArrowLeft, Heart, MessageSquare, Repeat2, Forward, Bookmark, BookmarkCheck, Quote, Link2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { format } from "date-fns";
import { useState } from "react";
import Composer from "@/components/Composer";
import ImageGrid from "@/components/ImageGrid";
import RichContent from "@/components/RichContent";
import VideoPlayer from "@/components/VideoPlayer";
import EmbedPlayer from "@/components/EmbedPlayer";
import { useTranslation } from "@/i18n/LanguageContext";
import PostCardMenu from "@/components/PostCardMenu";
import SharePostDialog from "@/components/SharePostDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [quoteComposerOpen, setQuoteComposerOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: post } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`id, content, created_at, parent_id, author_id, quote_post_id, video_url, embed_url, profiles!posts_author_id_fkey (id, username, display_name, avatar_url)`)
        .eq("id", postId!)
        .single();
      if (!data) return null;
      const { data: imgs } = await supabase
        .from("post_images")
        .select("url, position")
        .eq("post_id", postId!)
        .order("position");
      
      // Fetch quote post if present
      let quotePost = null;
      if ((data as any).quote_post_id) {
        const { data: qp } = await supabase
          .from("posts")
          .select("id, content, created_at, author_id, profiles!posts_author_id_fkey (username, display_name, avatar_url)")
          .eq("id", (data as any).quote_post_id)
          .single();
        if (qp) {
          const qProfile = qp.profiles as any;
          const { data: qImgs } = await supabase.from("post_images").select("url, position").eq("post_id", qp.id).order("position");
          quotePost = {
            id: qp.id, content: qp.content, createdAt: qp.created_at,
            authorName: qProfile?.display_name || "", authorHandle: qProfile?.username || "",
            authorAvatar: qProfile?.avatar_url || "", images: (qImgs || []).map(i => i.url),
          };
        }
      }
      
      return { ...data, images: (imgs || []).map((i) => i.url), quotePost };
    },
    enabled: !!postId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["replies", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(`id, content, created_at, parent_id, author_id, video_url, embed_url, profiles!posts_author_id_fkey (id, username, display_name, avatar_url)`)
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
          videoUrl: (r as any).video_url || null,
          embedUrl: (r as any).embed_url || null,
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

  // User interaction state for main post
  const { data: userLiked = false } = useQuery({
    queryKey: ["userLiked", postId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("likes").select("id").eq("user_id", user!.id).eq("post_id", postId!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!postId,
  });

  const { data: userReposted = false } = useQuery({
    queryKey: ["userReposted", postId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reposts").select("id").eq("user_id", user!.id).eq("post_id", postId!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!postId,
  });

  const { data: userBookmarked = false } = useQuery({
    queryKey: ["bookmark", postId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks").select("id").eq("user_id", user!.id).eq("post_id", postId!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!postId,
  });

  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Sync from queries
  const isLiked = liked !== userLiked ? liked : userLiked;
  const isReposted = reposted !== userReposted ? reposted : userReposted;
  const isBookmarked = bookmarked !== userBookmarked ? bookmarked : userBookmarked;

  const handleLike = async () => {
    if (!user || !postId) return;
    const newLiked = !isLiked;
    setLiked(newLiked);
    if (newLiked) {
      await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
      if (post?.author_id && post.author_id !== user.id) {
        await supabase.from("notifications").insert({ user_id: post.author_id, actor_id: user.id, type: "like", post_id: postId });
      }
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId);
    }
    queryClient.invalidateQueries({ queryKey: ["postStats", postId] });
    queryClient.invalidateQueries({ queryKey: ["userLiked", postId] });
  };

  const handleRepost = async () => {
    if (!user || !postId) return;
    const newReposted = !isReposted;
    setReposted(newReposted);
    if (newReposted) {
      await supabase.from("reposts").insert({ user_id: user.id, post_id: postId });
      if (post?.author_id && post.author_id !== user.id) {
        await supabase.from("notifications").insert({ user_id: post.author_id, actor_id: user.id, type: "repost", post_id: postId });
      }
    } else {
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", postId);
    }
    queryClient.invalidateQueries({ queryKey: ["postStats", postId] });
    queryClient.invalidateQueries({ queryKey: ["userReposted", postId] });
  };

  const handleBookmark = async () => {
    if (!user || !postId) return;
    const newBookmarked = !isBookmarked;
    setBookmarked(newBookmarked);
    if (newBookmarked) {
      const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId });
      if (error?.code === "23505") { toast.info("Already bookmarked"); return; }
      if (error) { toast.error("Failed to bookmark"); setBookmarked(false); return; }
      toast.success("Post saved");
    } else {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
      toast.success("Bookmark removed");
    }
    queryClient.invalidateQueries({ queryKey: ["bookmark", postId] });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success("Link copied!");
  };

  if (!post) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">{t("common.loading")}</div>;
  }

  const profile = post.profiles as any;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors bsky-hover">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">{t("detail.post")}</h2>
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
              <VerifiedBadge userId={post.author_id} />
            </p>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">
          <RichContent content={post.content} />
        </p>

        {post.images && post.images.length > 0 && (
          <div className="mt-3">
            <ImageGrid images={post.images} />
          </div>
        )}

        {(post as any).video_url && (
          <div className="mt-3">
            <VideoPlayer url={(post as any).video_url} />
          </div>
        )}

        {(post as any).embed_url && (
          <div className="mt-3">
            <EmbedPlayer url={(post as any).embed_url} />
          </div>
        )}

        {(post as any).quotePost && (
          <div
            className="mt-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/post/${(post as any).quotePost.id}`)}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <Avatar className="h-5 w-5">
                <AvatarImage src={(post as any).quotePost.authorAvatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                  {(post as any).quotePost.authorName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground truncate">{(post as any).quotePost.authorName}</span>
              <span className="text-muted-foreground truncate">@{(post as any).quotePost.authorHandle}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground flex-shrink-0">{timeAgo((post as any).quotePost.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground line-clamp-3">
              <RichContent content={(post as any).quotePost.content} />
            </p>
            {(post as any).quotePost.images && (post as any).quotePost.images.length > 0 && (
              <div className="mt-1.5">
                <ImageGrid images={(post as any).quotePost.images} />
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-sm text-muted-foreground">
          {format(new Date(post.created_at), "h:mm a · MMM d, yyyy")}
        </p>

        {/* Stats */}
        {(stats?.reposts || stats?.likes || stats?.replies) ? (
          <div className="mt-3 flex gap-4 border-t border-border pt-3 text-sm">
            {stats.replies > 0 && <span><strong>{stats.replies}</strong> <span className="text-muted-foreground">{t("detail.replies")}</span></span>}
            {stats.reposts > 0 && <span><strong>{stats.reposts}</strong> <span className="text-muted-foreground">{t("detail.reposts")}</span></span>}
            {stats.likes > 0 && <span><strong>{stats.likes}</strong> <span className="text-muted-foreground">{t("detail.likes")}</span></span>}
          </div>
        ) : null}

        {/* Action buttons */}
        {user && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            {/* Comment */}
            <button onClick={() => setReplyOpen(true)} className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary">
              <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {/* Repost dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`group flex items-center gap-1 rounded-full p-1.5 transition-colors hover:text-[hsl(var(--bsky-repost))] ${isReposted ? "text-[hsl(var(--bsky-repost))]" : "text-muted-foreground"}`}>
                  <Repeat2 className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 z-50 bg-background border border-border shadow-lg">
                <DropdownMenuItem onClick={handleRepost} className="cursor-pointer py-2.5 px-3 text-sm gap-2">
                  <Repeat2 className="h-4 w-4" />
                  {isReposted ? "Undo repost" : "Repost"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuoteComposerOpen(true)} className="cursor-pointer py-2.5 px-3 text-sm gap-2">
                  <Quote className="h-4 w-4" />
                  Quote post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Like */}
            <button onClick={handleLike} className={`group flex items-center gap-1 rounded-full p-1.5 transition-colors hover:text-[hsl(var(--bsky-like))] ${isLiked ? "text-[hsl(var(--bsky-like))]" : "text-muted-foreground"}`}>
              <Heart className="h-5 w-5" strokeWidth={1.75} fill={isLiked ? "currentColor" : "none"} />
            </button>

            {/* Bookmark */}
            <button onClick={handleBookmark} className={`group flex items-center gap-1 rounded-full p-1.5 transition-colors hover:text-primary ${isBookmarked ? "text-primary" : "text-muted-foreground"}`}>
              {isBookmarked ? <BookmarkCheck className="h-5 w-5" strokeWidth={1.75} fill="currentColor" /> : <Bookmark className="h-5 w-5" strokeWidth={1.75} />}
            </button>

            {/* Share dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary">
                  <Forward className="h-5 w-5" strokeWidth={1.75} style={{ filter: 'drop-shadow(0.4px 0px 0px currentColor)' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 z-50 bg-background border border-border shadow-lg">
                <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer py-2.5 px-3 text-sm gap-2">
                  <Link2 className="h-4 w-4" />
                  Copy link to post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)} className="cursor-pointer py-2.5 px-3 text-sm gap-2">
                  <Send className="h-4 w-4" />
                  Send via direct message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3-dot menu */}
            <PostCardMenu
              postId={postId!}
              authorId={post.author_id}
              authorHandle={profile?.username || ""}
              content={post.content}
              onHide={() => setHidden(true)}
            />
          </div>
        )}

      </div>

      {/* Replies */}
      {replies.map((reply) => (
        <PostCard key={reply.id} {...reply} />
      ))}

      <Composer open={replyOpen} onOpenChange={setReplyOpen} parentId={postId} />

      {/* Quote composer */}
      <Composer
        open={quoteComposerOpen}
        onOpenChange={setQuoteComposerOpen}
        quotePost={{
          id: postId!, content: post.content,
          authorName: profile?.display_name || "", authorHandle: profile?.username || "",
          authorAvatar: profile?.avatar_url || "", createdAt: post.created_at,
          images: post.images,
        }}
      />

      {/* Share via DM */}
      <SharePostDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} postId={postId!} />
    </div>
  );
}
