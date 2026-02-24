import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, Languages, Copy, BellOff, Filter, EyeOff, VolumeX, UserX, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes((l) => l + (newLiked ? 1 : -1));
    if (newLiked) setAnimating(true);

    if (newLiked) {
      await supabase.from("likes").insert({ user_id: user.id, post_id: id });
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
    } else {
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", id);
    }
  };

  const renderImages = () => {
    if (!images || images.length === 0) return null;
    const count = images.length;
    if (count === 1) {
      return (
        <div className="mt-2 overflow-hidden rounded-xl border border-border">
          <img src={images[0]} alt="" className="w-full object-cover" style={{ maxHeight: 400 }} />
        </div>
      );
    }
    return (
      <div className={`mt-2 grid gap-0.5 overflow-hidden rounded-xl border border-border ${count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-2" : "grid-cols-2"}`}>
        {images.slice(0, 4).map((img, i) => (
          <img key={i} src={img} alt="" className="aspect-square w-full object-cover" />
        ))}
      </div>
    );
  };

  // Auto-linkify URLs
  const renderContent = () => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} className="bsky-link" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <article
      className="flex gap-3 px-4 py-3 bsky-hover cursor-pointer bsky-divider"
      onClick={() => navigate(`/post/${id}`)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorHandle}`); }}>
        <Avatar className="h-11 w-11">
          <AvatarImage src={authorAvatar} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            {authorName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-1 text-sm">
          <span className="truncate font-semibold text-foreground">{authorName}</span>
          <span className="truncate bsky-text-secondary">@{authorHandle}</span>
          <span className="bsky-text-secondary">·</span>
          <span className="flex-shrink-0 bsky-text-secondary">{timeAgo(createdAt)}</span>
        </div>

        {/* Body */}
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground">
          {renderContent()}
        </p>

        {renderImages()}

        {/* Action bar */}
        <div className="mt-2 flex items-center justify-between -ml-1.5">
          <ActionButton icon={MessageCircle} count={replyCount} onClick={(e) => { e.stopPropagation(); navigate(`/post/${id}`); }} />
          <ActionButton
            icon={Repeat2}
            count={reposts}
            active={reposted}
            activeColor="text-bsky-repost"
            onClick={handleRepost}
          />
          <ActionButton
            icon={Heart}
            count={likes}
            active={liked}
            activeColor="text-bsky-like"
            animate={animating}
            onAnimationEnd={() => setAnimating(false)}
            onClick={handleLike}
            fill={liked}
          />
          <ActionButton icon={Bookmark} onClick={(e) => { e.stopPropagation(); }} />
          <ActionButton icon={Share} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/post/${id}`); }} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary">
                <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-50 bg-background border border-border shadow-lg">
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Translate</span>
                <Languages className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(content); }} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Copy post text</span>
                <Copy className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Mute thread</span>
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Mute words & tags</span>
                <Filter className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Hide post for me</span>
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Mute account</span>
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Block account</span>
                <UserX className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center justify-between py-3 px-4 cursor-pointer">
                <span>Report post</span>
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  icon: Icon,
  count,
  active,
  activeColor,
  animate,
  onAnimationEnd,
  onClick,
  fill,
}: {
  icon: any;
  count?: number;
  active?: boolean;
  activeColor?: string;
  animate?: boolean;
  onAnimationEnd?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  fill?: boolean;
}) {
  return (
    <button
      className={`group flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary ${active ? activeColor : ""}`}
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
