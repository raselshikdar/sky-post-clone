import { useState, useEffect } from "react";
import { Heart, MessageSquare, Repeat2, Forward, Bookmark, BookmarkCheck, Quote, Link2, Send } from "lucide-react";
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
  isLiked, isReposted, quotePost,
}: PostCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likeCount);
  const [reposted, setReposted] = useState(isReposted);
  const [reposts, setReposts] = useState(repostCount);
  const [pendingLike, setPendingLike] = useState(false);
  const [pendingRepost, setPendingRepost] = useState(false);

  // Keep local state in sync with query data, but only when no pending mutation
  useEffect(() => { if (!pendingLike) { setLiked(isLiked); setLikes(likeCount); } }, [isLiked, likeCount, pendingLike]);
  useEffect(() => { if (!pendingRepost) { setReposted(isReposted); setReposts(repostCount); } }, [isReposted, repostCount, pendingRepost]);
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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const prevLiked = liked;
    const newLiked = !prevLiked;
    setPendingLike(true);
    setLiked(newLiked);
    setLikes((l) => l + (newLiked ? 1 : -1));
    if (newLiked) setAnimating(true);

    try {
      if (newLiked) {
        const { error } = await supabase.from("likes").insert({ user_id: user.id, post_id: id });
        if (error && error.code !== "23505") {
          setLiked(prevLiked);
          setLikes((l) => l - 1);
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
        }
      }
    } finally {
      setPendingLike(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const prevReposted = reposted;
    const newReposted = !prevReposted;
    setPendingRepost(true);
    setReposted(newReposted);
    setReposts((r) => r + (newReposted ? 1 : -1));

    try {
      if (newReposted) {
        const { error } = await supabase.from("reposts").insert({ user_id: user.id, post_id: id });
        if (error && error.code !== "23505") {
          setReposted(prevReposted);
          setReposts((r) => r - 1);
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
        }
      }
    } finally {
      setPendingRepost(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
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

  const BookmarkIcon = bookmarked || isBookmarked ? BookmarkCheck : Bookmark;

  return (
    <>
      <article
        className="flex gap-3 px-4 py-3 cursor-pointer bsky-divider"
        onClick={() => navigate(`/post/${id}`)}
      >
        <div className="flex-shrink-0 pt-0.5">
          <LiveAvatar
            userId={authorId}
            src={authorAvatar}
            fallback={authorName[0]?.toUpperCase() || "?"}
            className="h-11 w-11"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}
            onLiveClick={() => navigate(`/profile/${authorHandle}`)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="truncate font-semibold text-foreground hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}>{authorName}</span>
            <VerifiedBadge userId={authorId} />
            <span className="truncate bsky-text-secondary">@{authorHandle}</span>
            <span className="bsky-text-secondary">·</span>
            <span className="flex-shrink-0 bsky-text-secondary">{timeAgo(createdAt)}</span>
          </div>

          <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground">
            <RichContent content={content} />
          </p>

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
            <ActionButton icon={MessageSquare} count={replyCount} onClick={(e) => { e.stopPropagation(); setReplyComposerOpen(true); }} />
            
            {/* Repost dropdown with quote option */}
            <DropdownMenu open={repostMenuOpen} onOpenChange={setRepostMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-[hsl(var(--bsky-repost))] ${reposted ? "text-[hsl(var(--bsky-repost))]" : ""}`}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRepostMenuOpen(prev => !prev); }}
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <Repeat2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {reposts > 0 && <span className="text-xs">{reposts}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 z-50 bg-background border border-border shadow-lg">
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleRepost(e as any); }}
                  className="cursor-pointer py-2.5 px-3 text-sm gap-2"
                >
                  <Repeat2 className="h-4 w-4" />
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
              icon={Heart} count={likes} active={liked} activeColor="text-[hsl(var(--bsky-like))]" hoverColor="hover:text-[hsl(var(--bsky-like))]"
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
                  <Forward className="h-[18px] w-[18px]" strokeWidth={1.75} style={{ filter: 'drop-shadow(0.4px 0px 0px currentColor)' }} />
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
      className={`group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors ${hoverColor || "hover:text-primary"} ${active ? activeColor : ""}`}
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
