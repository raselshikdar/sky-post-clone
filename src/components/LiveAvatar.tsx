import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveStatus } from "@/hooks/use-live-status";

interface LiveAvatarProps {
  userId: string;
  src: string;
  fallback: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onLiveClick?: () => void;
}

/**
 * Avatar wrapper that shows a pulsing LIVE ring + badge when the user is live streaming.
 */
export default function LiveAvatar({ userId, src, fallback, className = "h-11 w-11", onClick, onLiveClick }: LiveAvatarProps) {
  const { data: liveStatus } = useLiveStatus(userId);
  const isLive = !!liveStatus;

  return (
    <div className="relative flex-shrink-0">
      <Avatar
        className={`${className} cursor-pointer ${isLive ? "ring-2 ring-destructive ring-offset-2 ring-offset-background" : ""}`}
        onClick={onClick}
      >
        <AvatarImage src={src} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
          {fallback}
        </AvatarFallback>
      </Avatar>
      {isLive && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-[8px] font-bold px-1 py-[1px] rounded cursor-pointer animate-pulse leading-none"
          onClick={(e) => { e.stopPropagation(); onLiveClick?.(); }}
        >
          LIVE
        </span>
      )}
    </div>
  );
}
