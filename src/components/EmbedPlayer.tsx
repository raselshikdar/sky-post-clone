import { useMemo } from "react";

interface EmbedPlayerProps {
  url: string;
  className?: string;
}

const PLATFORM_PATTERNS: { name: string; match: (url: string) => boolean; getEmbedUrl: (url: string) => string | null }[] = [
  {
    name: "YouTube",
    match: (u) => /(?:youtube\.com|youtu\.be)/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        let videoId: string | null = null;
        if (url.hostname.includes("youtu.be")) {
          videoId = url.pathname.slice(1);
        } else if (url.pathname.includes("/shorts/")) {
          videoId = url.pathname.split("/shorts/")[1]?.split(/[?/]/)[0] || null;
        } else {
          videoId = url.searchParams.get("v");
        }
        if (!videoId) return null;
        const t = url.searchParams.get("t");
        return `https://www.youtube.com/embed/${videoId}${t ? `?start=${parseInt(t)}` : ""}`;
      } catch { return null; }
    },
  },
  {
    name: "Facebook",
    match: (u) => /facebook\.com\/.*\/videos\/|fb\.watch/.test(u),
    getEmbedUrl: (u) => {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false&width=560`;
    },
  },
  {
    name: "VDO.Ninja",
    match: (u) => /vdo\.ninja/.test(u),
    getEmbedUrl: (u) => u,
  },
  {
    name: "Twitch",
    match: (u) => /twitch\.tv/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        const paths = url.pathname.split("/").filter(Boolean);
        if (paths.includes("videos") && paths.length >= 2) {
          const videoId = paths[paths.indexOf("videos") + 1];
          return `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`;
        }
        const channel = paths[0];
        if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
        return null;
      } catch { return null; }
    },
  },
  {
    name: "Vimeo",
    match: (u) => /vimeo\.com/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        const videoId = url.pathname.split("/").filter(Boolean).pop();
        return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
      } catch { return null; }
    },
  },
  {
    name: "Dailymotion",
    match: (u) => /dailymotion\.com|dai\.ly/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        let videoId: string | null = null;
        if (url.hostname.includes("dai.ly")) {
          videoId = url.pathname.slice(1);
        } else {
          const match = url.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
          videoId = match?.[1] || null;
        }
        return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : null;
      } catch { return null; }
    },
  },
  {
    name: "Kick",
    match: (u) => /kick\.com/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        const channel = url.pathname.split("/").filter(Boolean)[0];
        return channel ? `https://player.kick.com/${channel}` : null;
      } catch { return null; }
    },
  },
  {
    name: "Rumble",
    match: (u) => /rumble\.com/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        const match = url.pathname.match(/\/embed\/([a-zA-Z0-9]+)/);
        if (match) return u;
        // For non-embed URLs, try to construct embed
        const videoMatch = url.pathname.match(/\/(v[a-zA-Z0-9]+)/);
        return videoMatch ? `https://rumble.com/embed/${videoMatch[1]}/` : null;
      } catch { return null; }
    },
  },
  {
    name: "Streamable",
    match: (u) => /streamable\.com/.test(u),
    getEmbedUrl: (u) => {
      try {
        const url = new URL(u);
        const videoId = url.pathname.split("/").filter(Boolean).pop();
        return videoId ? `https://streamable.com/e/${videoId}` : null;
      } catch { return null; }
    },
  },
];

export function getEmbedInfo(url: string): { name: string; embedUrl: string } | null {
  for (const platform of PLATFORM_PATTERNS) {
    if (platform.match(url)) {
      const embedUrl = platform.getEmbedUrl(url);
      if (embedUrl) return { name: platform.name, embedUrl };
    }
  }
  return null;
}

export function isEmbeddableUrl(url: string): boolean {
  return PLATFORM_PATTERNS.some((p) => p.match(url));
}

export default function EmbedPlayer({ url, className = "" }: EmbedPlayerProps) {
  const embedInfo = useMemo(() => getEmbedInfo(url), [url]);

  if (!embedInfo) {
    // Fallback: show as a clickable link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-primary hover:bg-accent transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        🎬 Watch video on external site
      </a>
    );
  }

  return (
    <div className={`mt-2 overflow-hidden rounded-xl border border-border ${className}`} onClick={(e) => e.stopPropagation()}>
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedInfo.embedUrl}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
