import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { ArrowLeft, Hash } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: hashtag } = useQuery({
    queryKey: ["hashtag", tag],
    queryFn: async () => {
      const { data } = await supabase.from("hashtags").select("*").eq("name", tag!.toLowerCase()).maybeSingle();
      return data;
    },
    enabled: !!tag,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["hashtag_posts", tag, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_posts_by_search", {
        p_pattern: `%#${tag}%`,
        p_viewer_id: user?.id ?? null,
        p_limit: 50,
      });
      if (error) { console.error("get_posts_by_search error:", error); return []; }
      return (data as any[]) || [];
    },
    enabled: !!tag,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors bsky-hover"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-1"><Hash className="h-5 w-5 text-primary" />{tag}</h2>
          {hashtag && <p className="text-sm text-muted-foreground">{hashtag.post_count} {hashtag.post_count === 1 ? t("hashtag.post") : t("hashtag.posts")}</p>}
        </div>
      </div>
      {isLoading && <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
      {!isLoading && posts.length === 0 && <p className="py-12 text-center text-muted-foreground">{t("hashtag.no_posts")} #{tag}</p>}
      {posts.map((post: any) => <PostCard key={post.id} {...post} />)}
    </div>
  );
}
