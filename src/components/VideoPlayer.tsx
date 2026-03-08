interface VideoPlayerProps {
  url: string;
  className?: string;
}

export default function VideoPlayer({ url, className = "" }: VideoPlayerProps) {
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      className={`mt-2 w-full rounded-xl border border-border ${className}`}
      style={{ maxHeight: "500px" }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
