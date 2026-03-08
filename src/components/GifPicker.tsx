import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GifData {
  id: string;
  title: string;
  preview: string;
  url: string;
  original: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (gifUrl: string) => void;
}

export default function GifPicker({ open, onOpenChange, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchGifs = useCallback(async (searchQuery: string, newOffset: number, append = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("giphy-search", {
        body: { query: searchQuery, offset: newOffset, limit: 20 },
      });
      if (error) throw error;
      const results = data.gifs || [];
      setGifs(prev => append ? [...prev, ...results] : results);
      setHasMore(results.length === 20);
      setOffset(newOffset + results.length);
    } catch {
      // Silently fail — toast would be intrusive for search
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setGifs([]);
      setOffset(0);
      fetchGifs("", 0);
    }
  }, [open, fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setGifs([]);
      setOffset(0);
      fetchGifs(query, 0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, fetchGifs]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      fetchGifs(query, offset, true);
    }
  };

  const handleSelect = (gif: GifData) => {
    onSelect(gif.url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 [&>button]:hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button onClick={() => onOpenChange(false)} className="text-sm font-semibold text-primary">
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full rounded-full bg-muted pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
        </div>

        {/* GIF grid */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2 min-h-0"
        >
          {gifs.length === 0 && !loading && (
            <p className="text-center text-muted-foreground text-sm py-8">
              {query ? "No GIFs found" : "Loading trending GIFs..."}
            </p>
          )}

          <div className="columns-2 gap-1.5 space-y-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleSelect(gif)}
                className="w-full rounded-lg overflow-hidden hover:opacity-80 transition-opacity break-inside-avoid"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* GIPHY attribution */}
        <div className="px-4 py-2 border-t border-border flex justify-center">
          <span className="text-[10px] text-muted-foreground">Powered by GIPHY</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
