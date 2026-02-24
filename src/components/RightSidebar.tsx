import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const trendingTopics = [
  { tag: "Technology", posts: "12.4K" },
  { tag: "Design", posts: "8.2K" },
  { tag: "React", posts: "5.1K" },
  { tag: "OpenSource", posts: "3.8K" },
];

const suggestedUsers = [
  { name: "Alice Chen", handle: "alice", initial: "A" },
  { name: "Bob Smith", handle: "bob", initial: "B" },
  { name: "Carol Wu", handle: "carol", initial: "C" },
];

export default function RightSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[320px] flex-col gap-4 overflow-y-auto py-4 pl-6 xl:flex">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search"
          className="rounded-full border-border bg-secondary pl-9 focus-visible:ring-primary"
        />
      </div>

      {/* Trending */}
      <div className="rounded-2xl bg-secondary p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="h-5 w-5" />
          What's Hot
        </h3>
        <div className="space-y-3">
          {trendingTopics.map((topic) => (
            <div key={topic.tag} className="cursor-pointer transition-colors bsky-hover rounded-lg p-2 -mx-2">
              <p className="text-sm font-semibold">#{topic.tag}</p>
              <p className="text-xs text-muted-foreground">{topic.posts} posts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested */}
      <div className="rounded-2xl bg-secondary p-4">
        <h3 className="mb-3 text-lg font-bold">Suggested for you</h3>
        <div className="space-y-3">
          {suggestedUsers.map((u) => (
            <div key={u.handle} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.handle}</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 rounded-full text-xs font-semibold">
                Follow
              </Button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
