import { ArrowLeft, Settings, ChevronRight, Compass, ListFilter, Flame, Heart, Users, Newspaper, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

const feedItems = [
  { name: "Discover", icon: Compass, color: "bg-primary", hasArrow: true },
  { name: "Following", icon: ListFilter, color: "bg-foreground", hasArrow: false },
  { name: "What's Hot Classic", icon: Flame, color: "bg-primary", hasArrow: true },
  { name: "Popular With Friends", icon: Heart, color: "bg-primary", hasArrow: true },
  { name: "Bluesky Team", icon: Users, color: "bg-primary", hasArrow: true },
  { name: "News", icon: Newspaper, color: "bg-muted-foreground", hasArrow: true },
  { name: "Science", icon: Pencil, color: "bg-green-500", hasArrow: true },
];

export default function Feeds() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">Feeds</h2>
        <button className="p-1">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* My Feeds header */}
      <div className="flex items-center gap-4 px-4 py-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
          <ListFilter className="h-7 w-7 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">My Feeds</h3>
          <p className="text-sm text-muted-foreground">All the feeds you've saved, right in one place.</p>
        </div>
      </div>

      {/* Feed list */}
      <div className="border-t border-border">
        {feedItems.map((item) => (
          <button
            key={item.name}
            className="flex w-full items-center gap-4 px-4 py-4 bsky-hover border-b border-border"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color} text-white`}>
              <item.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="flex-1 text-left text-[15px] font-medium text-foreground">{item.name}</span>
            {item.hasArrow && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>
        ))}
      </div>

      {/* Discover new feeds */}
      <div className="px-4 py-5">
        <h3 className="text-lg font-bold text-foreground">Discover New Feeds</h3>
      </div>
    </div>
  );
}
