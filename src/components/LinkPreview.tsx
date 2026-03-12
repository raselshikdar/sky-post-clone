import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  site_name: string;
  domain: string;
  favicon: string;
  url: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const { data, isLoading, isError } = useQuery<PreviewData>({
    queryKey: ["link_preview", url],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("link-preview", {
        body: { url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="mt-2 rounded-xl border border-border overflow-hidden animate-pulse">
        <div className="h-[140px] bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-1/3 bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isError || !data || (!data.title && !data.image)) return null;

  return (
    <a
      href={data.url || url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block rounded-xl border border-border overflow-hidden hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        <div className="relative w-full h-[160px] bg-muted overflow-hidden">
          <img
            src={data.image}
            alt={data.title || "Link preview"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <span className="truncate">{data.domain}</span>
        </div>
        {data.title && (
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}
