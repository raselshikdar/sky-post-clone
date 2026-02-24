import { useState } from "react";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);
    setResults(data || []);
    setSearching(false);
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users"
            className="rounded-full border-border bg-secondary pl-9 focus-visible:ring-primary"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {searching && (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {results.map((user) => (
        <div
          key={user.id}
          className="flex cursor-pointer items-center gap-3 px-4 py-3 bsky-divider bsky-hover"
          onClick={() => navigate(`/profile/${user.username}`)}
        >
          <Avatar className="h-11 w-11">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.display_name}</p>
            <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.bio}</p>}
          </div>
        </div>
      ))}

      {query.length >= 2 && !searching && results.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No users found</p>
      )}
    </div>
  );
}
