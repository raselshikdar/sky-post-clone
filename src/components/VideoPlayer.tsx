import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

interface VideoPlayerProps {
  url: string;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({ url, className = "", muted = true, loop = false, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      clearTimeout(hideTimerRef.current);
    } else {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
        setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { if (!loop) setPlaying(false); };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [loop, isSeeking]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play(); else video.pause();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setProgress(ratio * 100);
    setCurrentTime(video.currentTime);
  };

  const handleProgressDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsSeeking(true);
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;

    const move = (ev: PointerEvent) => {
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      setProgress(ratio * 100);
      setCurrentTime(ratio * video.duration);
    };
    const up = (ev: PointerEvent) => {
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
      setIsSeeking(false);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={containerRef}
      className={`relative mt-2 w-full overflow-hidden rounded-xl border border-border bg-black ${isFullscreen ? "flex items-center justify-center" : ""} ${className}`}
      style={isFullscreen ? {} : { maxHeight: "500px" }}
      onClick={(e) => { e.stopPropagation(); togglePlay(e); }}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      <video
        ref={videoRef}
        src={url}
        playsInline
        preload="metadata"
        muted={isMuted}
        loop={loop}
        autoPlay={autoPlay}
        className="h-full w-full object-contain"
        style={isFullscreen ? { maxHeight: "100vh" } : { maxHeight: "500px" }}
      />

      {/* Gradient overlay at bottom */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7) 70%)", height: "100px" }}
      />

      {/* Controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-0 px-2 pb-2 pt-1 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="group relative mx-1 mb-1.5 h-[3px] cursor-pointer rounded-full bg-white/30 transition-all hover:h-[5px]"
          onClick={handleProgressClick}
          onPointerDown={handleProgressDrag}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>

        {/* Bottom row: play, time, volume, fullscreen */}
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="flex h-8 w-8 items-center justify-center text-white hover:text-white/80 transition-colors">
            {playing ? <Pause className="h-5 w-5" fill="white" /> : <Play className="h-5 w-5" fill="white" />}
          </button>

          {/* Time */}
          <span className="min-w-[80px] text-xs font-medium text-white tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button onClick={toggleMute} className="flex h-8 w-8 items-center justify-center text-white hover:text-white/80 transition-colors">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="flex h-8 w-8 items-center justify-center text-white hover:text-white/80 transition-colors">
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Big center play button when paused */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="h-7 w-7 text-white ml-1" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
}
