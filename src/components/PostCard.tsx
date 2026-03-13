import { useState, useRef, useEffect } from "react";
import { Quote, Link2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PostCardMenu from "@/components/PostCardMenu";
import VerifiedBadge from "@/components/VerifiedBadge";
import ImageGrid from "@/components/ImageGrid";
import RichContent from "@/components/RichContent";
import VideoPlayer from "@/components/VideoPlayer";
import EmbedPlayer from "@/components/EmbedPlayer";
import LiveAvatar from "@/components/LiveAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Composer from "@/components/Composer";
import SharePostDialog from "@/components/SharePostDialog";
import LinkPreview from "@/components/LinkPreview";

// --- Bluesky Custom SVG Icons ---
const BskyComment = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const BskyRepost = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m17 2 4 4-4 4"></path>
    <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
    <path d="m7 22-4-4 4-4"></path>
    <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const BskyLike = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
  </svg>
);

const BskySave = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
  </svg>
);

const BskyShare = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="15 14 20 9 15 4"></polyline>
    <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
  </svg>
);
// --------------------------------

/** Extract the first URL from post content */
function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

interface PostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  images?: string[];
  videoUrl?: string | null;
  embedUrl?: string | null;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isReplied?: boolean;
  repostedBy?: { username: string; displayName: string } | null;
  quotePost?: {
    id: string;
    content: string;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    createdAt: string;
    images?: string[];
  } | null;
}

export default function PostCard({
  id, authorId, authorName, authorHandle, authorAvatar,
  content, createdAt, images, videoUrl, embedUrl, likeCount, replyCount, repostCount,
  isLiked, isReposted, isReplied, repostedBy, quotePost,
}: PostCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likeCount);
  const [reposted, setReposted] = useState(isReposted);
  const [reposts, setReposts] = useState(repostCount);
  const mutatingLike = useRef(false);
  const mutatingRepost = useRef(false);

  // Sync from props (e.g. after reload/refetch) but skip during active mutations
  useEffect(() => { if (!mutatingLike.current) { setLiked(isLiked); setLikes(likeCount); } }, [isLiked, likeCount]);
  useEffect(() => { if (!mutatingRepost.current) { setReposted(isReposted); setReposts(repostCount); } }, [isReposted, repostCount]);
  const [animating, setAnimating] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [quoteComposerOpen, setQuoteComposerOpen] = useState(false);
  const [replyComposerOpen, setReplyComposerOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Bookmark state
  const { data: isBookmarked = false } = useQuery({
    queryKey: ["bookmark", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks").select("id").eq("user_id", user!.id).eq("post_id", id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 60000,
  });
  const [bookmarked, setBookmarked] = useState(false);

  // Sync bookmark state when query data changes
  useState(() => { setBookmarked(isBookmarked); });

  // Helper: update like/repost state across all cached query keys
  const updatePostInCache = (postId: string, updater: (post: any) => any) => {
    queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((p: any) => p.id === postId ? updater(p) : p);
    });
    queryClient.setQueriesData({ queryKey: ["post", postId] }, (old: any) => {
      if (!old) return old;
      return updater(old);
    });
    queryClient.setQueriesData({ queryKey: ["profilePosts"] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((p: any) => p.id === postId ? updater(p) : p);
    });
    queryClient.setQueriesData({ queryKey: ["replies"] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((p: any) => p.id === postId ? updater(p) : p);
    });
    queryClient.setQueriesData({ queryKey: ["hashtag_posts"] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((p: any) => p.id === postId ? updater(p) : p);
    });
    queryClient.setQueriesData({ queryKey: ["trending_topic_posts"] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((p: any) => p.id === postId ? updater(p) : p);
    });
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    mutatingLike.current = true;
    const prevLiked = liked;
    const newLiked = !prevLiked;
    setLiked(newLiked);
    setLikes((l) => l + (newLiked ? 1 : -1));
    if (newLiked) setAnimating(true);

    // Optimistic cache update across all queries
    updatePostInCache(id, (p: any) => ({
      ...p,
      isLiked: newLiked,
      likeCount: (p.likeCount ?? 0) + (newLiked ? 1 : -1),
    }));

    if (newLiked) {
      const { error } = await supabase.from("likes").insert({ user_id: user.id, post_id: id });
      if (error && error.code !== "23505") {
        setLiked(prevLiked);
        setLikes((l) => l - 1);
        updatePostInCache(id, (p: any) => ({ ...p, isLiked: prevLiked, likeCount: (p.likeCount ?? 0) - 1 }));
        mutatingLike.current = false;
        return;
      }
      if (authorId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: authorId, actor_id: user.id, type: "like", post_id: id,
        });
      }
    } else {
      const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", id);
      if (error) {
        setLiked(prevLiked);
        setLikes((l) => l + 1);
        updatePostInCache(id, (p: any) => ({ ...p, isLiked: prevLiked, likeCount: (p.likeCount ?? 0) + 1 }));
      }
    }
    // Background invalidation for eventual consistency
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["post", id] });
    setTimeout(() => { mutatingLike.current = false; }, 2000);
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    mutatingRepost.current = true;
    const prevReposted = reposted;
    const newReposted = !prevReposted;
    setReposted(newReposted);
    setReposts((r) => r + (newReposted ? 1 : -1));

    // Optimistic cache update across all queries
    updatePostInCache(id, (p: any) => ({
      ...p,
      isReposted: newReposted,
      repostCount: (p.repostCount ?? 0) + (newReposted ? 1 : -1),
    }));

    if (newReposted) {
      const { error } = await supabase.from("reposts").insert({ user_id: user.id, post_id: id });
      if (error && error.code !== "23505") {
        setReposted(prevReposted);
        setReposts((r) => r - 1);
        updatePostInCache(id, (p: any) => ({ ...p, isReposted: prevReposted, repostCount: (p.repostCount ?? 0) - 1 }));
        mutatingRepost.current = false;
        return;
      }
      if (authorId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: authorId, actor_id: user.id, type: "repost", post_id: id,
        });
      }
    } else {
      const { error } = await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", id);
      if (error) {
        setReposted(prevReposted);
        setReposts((r) => r + 1);
        updatePostInCache(id, (p: any) => ({ ...p, isReposted: prevReposted, repostCount: (p.repostCount ?? 0) + 1 }));
      }
    }
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["post", id] });
    setTimeout(() => { mutatingRepost.current = false; }, 2000);
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);

    if (newBookmarked) {
      const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, post_id: id });
      if (error?.code === "23505") { toast.info("Already bookmarked"); return; }
      if (error) { toast.error("Failed to bookmark"); setBookmarked(false); return; }
      toast.success("Post saved");
    } else {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", id);
      toast.success("Bookmark removed");
    }
    queryClient.invalidateQueries({ queryKey: ["bookmark", id] });
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${id}`;
    navigator.clipboard.writeText(postUrl);
    toast.success("Link copied!");
  };

  const handleSendDM = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareDialogOpen(true);
  };

  if (hidden) return null;

  const BookmarkIcon = BskySave;

  return (
    <>
      <article
        className="flex flex-col cursor-pointer bsky-divider"
        onClick={() => navigate(`/post/${id}`)}
      >
        {repostedBy && (
          <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0 ml-[52px] text-[13px] text-muted-foreground font-medium">
            <BskyRepost className="h-3.5 w-3.5" strokeWidth={2} />
            <span
              className="hover:underline cursor-pointer"
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${repostedBy.username}`); }}
            >
              Reposted by @{repostedBy.username}
            </span>
          </div>
        )}
        <div className="flex gap-3 px-4 py-3 pt-2">
        <div className="flex-shrink-0 pt-0.5">
          <LiveAvatar
            userId={authorId}
            src={authorAvatar}
            fallback={(authorName || "?")[0]?.toUpperCase() || "?"}
            className="h-11 w-11"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}
            onLiveClick={() => navigate(`/profile/${authorHandle}`)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-0.5 text-sm">
            <span className="truncate font-semibold text-foreground hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}>{authorName}</span>
            <VerifiedBadge userId={authorId} />
            <span className="truncate bsky-text-secondary">@{authorHandle}</span>
            <span className="bsky-text-secondary">·</span>
            <span className="flex-shrink-0 bsky-text-secondary">{timeAgo(createdAt)}</span>
          </div>

          <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground">
            <RichContent content={content} />
          </p>

          {/* Link preview - only show if no images/video/embed */}
          {!images?.length && !videoUrl && !embedUrl && extractFirstUrl(content) && (
            <LinkPreview url={extractFirstUrl(content)!} />
          )}

          {images && images.length > 0 && <ImageGrid images={images} />}

          {videoUrl && <VideoPlayer url={videoUrl} />}

          {embedUrl && <EmbedPlayer url={embedUrl} />}

          {/* Quoted post embed */}
          {quotePost && (
            <div
              className="mt-2 rounded-xl border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={(e) => { e.stopPropagation(); navigate(`/post/${quotePost.id}`); }}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={quotePost.authorAvatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                    {quotePost.authorName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground truncate">{quotePost.authorName}</span>
                <span className="text-muted-foreground truncate">@{quotePost.authorHandle}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground flex-shrink-0">{timeAgo(quotePost.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground line-clamp-3">
                <RichContent content={quotePost.content} />
              </p>
              {quotePost.images && quotePost.images.length > 0 && (
                <div className="mt-1.5">
                  <ImageGrid images={quotePost.images} />
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between -ml-1.5">
            <ActionButton icon={BskyComment} count={replyCount} active={isReplied} activeColor="text-[hsl(var(--bsky-reply))]" hoverColor="hover:text-[hsl(var(--bsky-reply))]" onClick={(e) => { e.stopPropagation(); setReplyComposerOpen(true); }} />
            
            {/* Repost dropdown with quote option */}
            <DropdownMenu open={repostMenuOpen} onOpenChange={setRepostMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`group flex items-center gap-1 rounded-full p-1.5 transition-colors hover:text-[hsl(var(--bsky-repost))] ${reposted ? "text-[hsl(var(--bsky-repost))]" : "text-muted-foreground"}`}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRepostMenuOpen(prev => !prev); }}
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <BskyRepost className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {reposts > 0 && <span className="text-xs">{reposts}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 z-50 bg-background border border-border shadow-lg">
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleRepost(e as any); }}
                  className="cursor-pointer py-2.5 px-3 text-sm gap-2"
                >
                  <BskyRepost className="h-4 w-4" />
                  {reposted ? "Undo repost" : "Repost"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setQuoteComposerOpen(true); }}
                  className="cursor-pointer py-2.5 px-3 text-sm gap-2"
                >
                  <Quote className="h-4 w-4" />
                  Quote post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ActionButton
              icon={BskyLike} count={likes} active={liked} activeColor="text-[hsl(var(--bsky-like))]" hoverColor="hover:text-[hsl(var(--bsky-like))]"
              animate={animating} onAnimationEnd={() => setAnimating(false)} onClick={handleLike} fill={liked}
            />
            <ActionButton
              icon={BookmarkIcon}
              active={bookmarked || isBookmarked}
              activeColor="text-primary"
              onClick={handleBookmark}
              fill={bookmarked || isBookmarked}
            />
            <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShareMenuOpen(prev => !prev); }}
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <BskyShare className="h-[18px] w-[18px]" strokeWidth={1.75} style={{ filter: 'drop-shadow(0.4px 0px 0px currentColor)' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 z-50 bg-background border border-border shadow-lg">
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleCopyLink(e as any); setShareMenuOpen(false); }}
                  className="cursor-pointer py-2.5 px-3 text-sm gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Copy link to post
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleSendDM(e as any); setShareMenuOpen(false); }}
                  className="cursor-pointer py-2.5 px-3 text-sm gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send via direct message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PostCardMenu
              postId={id}
              authorId={authorId}
              authorHandle={authorHandle}
              content={content}
              onHide={() => setHidden(true)}
            />
          </div>
        </div>
        </div>
      </article>

      {/* Reply composer */}
      <Composer
        open={replyComposerOpen}
        onOpenChange={setReplyComposerOpen}
        parentId={id}
      />

      {/* Quote composer */}
      <Composer
        open={quoteComposerOpen}
        onOpenChange={setQuoteComposerOpen}
        quotePost={{ id, content, authorName, authorHandle, authorAvatar, createdAt, images }}
      />

      {/* Share via DM dialog */}
      <SharePostDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        postId={id}
      />
    </>
  );
}

function ActionButton({
  icon: Icon, count, active, activeColor, animate, onAnimationEnd, onClick, fill, hoverColor,
}: {
  icon: any; count?: number; active?: boolean; activeColor?: string;
  animate?: boolean; onAnimationEnd?: () => void; onClick?: (e: React.MouseEvent) => void; fill?: boolean; hoverColor?: string;
}) {
  return (
    <button
      className={`group flex items-center gap-1 rounded-full p-1.5 transition-colors ${active ? activeColor : "text-muted-foreground"} ${active ? "" : (hoverColor || "hover:text-primary")}`}
      onClick={onClick}
    >
      <Icon
        className={`h-[18px] w-[18px] ${animate ? "like-animation" : ""}`}
        strokeWidth={1.75}
        fill={fill ? "currentColor" : "none"}
        onAnimationEnd={onAnimationEnd}
      />
      {count !== undefined && count > 0 && (
        <span className="text-xs">{count}</span>
      )}
    </button>
  );
}
