interface VideoPlayerProps {
  url: string;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
}

export default function VideoPlayer({ url, className = "", muted = true, loop = false, autoPlay = false }: VideoPlayerProps) {
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      muted={muted}
      loop={loop}
      autoPlay={autoPlay}
      className={`mt-2 w-full rounded-xl border border-border ${className}`}
      style={{ maxHeight: "500px" }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
