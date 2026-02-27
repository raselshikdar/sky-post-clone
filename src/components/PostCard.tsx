import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Share, Bookmark, BookmarkCheck, MoreHorizontal } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  images?: string[];
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
}

export default function PostCard({
  id, authorId, authorName, authorHandle, authorAvatar,
  content, createdAt, images, likeCount, replyCount, repostCount,
  isLiked, isReposted,
}: PostCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likeCount);
  const [reposted, setReposted] = useState(isReposted);
  const [reposts, setReposts] = useState(repostCount);
  const [animating, setAnimating] = useState(false);
  const [hidden, setHidden] = useState(false);
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
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes((l) => l + (newLiked ? 1 : -1));
    if (newLiked) setAnimating(true);

    if (newLiked) {
      await supabase.from("likes").insert({ user_id: user.id, post_id: id });
      // Create notification for post author (not self)
      if (authorId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: authorId, actor_id: user.id, type: "like", post_id: id,
        });
      }
    } else {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", id);
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newReposted = !reposted;
    setReposted(newReposted);
    setReposts((r) => r + (newReposted ? 1 : -1));

    if (newReposted) {
      await supabase.from("reposts").insert({ user_id: user.id, post_id: id });
      // Create notification for post author (not self)
      if (authorId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: authorId, actor_id: user.id, type: "repost", post_id: id,
        });
      }
    } else {
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", id);
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const postUrl = `${window.location.origin}/post/${id}`;

  const shareOptions = [
    { label: "Copy link", onClick: () => { navigator.clipboard.writeText(postUrl); toast.success("Link copied!"); } },
    { label: "Share on X/Twitter", onClick: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(content.slice(0, 100))}`, "_blank") },
    { label: "Share on Facebook", onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, "_blank") },
    { label: "Share on WhatsApp", onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(content.slice(0, 100) + " " + postUrl)}`, "_blank") },
    { label: "Share on Telegram", onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(content.slice(0, 100))}`, "_blank") },
  ];

  const renderImages = () => {
    if (!images || images.length === 0) return null;
    return <ImageGrid images={images} />;
  };

  const renderContent = () => <RichContent content={content} />;

  if (hidden) return null;

  const BookmarkIcon = bookmarked || isBookmarked ? BookmarkCheck : Bookmark;

  return (
    <article
      className="flex gap-3 px-4 py-3 cursor-pointer bsky-divider"
      onClick={() => navigate(`/post/${id}`)}
    >
      <div className="flex-shrink-0 pt-0.5">
        <Avatar className="h-11 w-11 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}>
          <AvatarImage src={authorAvatar} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            {authorName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-sm">
          <span className="truncate font-semibold text-foreground hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}>{authorName}</span>
          <VerifiedBadge userId={authorId} className="h-4 w-4" />
          <span className="truncate bsky-text-secondary">@{authorHandle}</span>
          <span className="bsky-text-secondary">·</span>
          <span className="flex-shrink-0 bsky-text-secondary">{timeAgo(createdAt)}</span>
        </div>

        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground">
          {renderContent()}
        </p>

        {renderImages()}

        <div className="mt-2 flex items-center justify-between -ml-1.5">
          <ActionButton icon={MessageCircle} count={replyCount} onClick={(e) => { e.stopPropagation(); navigate(`/post/${id}`); }} />
          <ActionButton icon={Repeat2} count={reposts} active={reposted} activeColor="text-[hsl(var(--bsky-repost))]" hoverColor="hover:text-[hsl(var(--bsky-repost))]" onClick={handleRepost} />
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
          {/* Share dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={handleShare}>
              <button className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary">
                <Share className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50 bg-background border border-border shadow-lg">
              {shareOptions.map((opt) => (
                <DropdownMenuItem key={opt.label} onClick={(e) => { e.stopPropagation(); opt.onClick(); }} className="cursor-pointer py-2.5 px-3 text-sm">
                  {opt.label}
                </DropdownMenuItem>
              ))}
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
