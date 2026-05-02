import { ArrowLeft, BookmarkX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";

export default function SavedPosts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: savedPosts = [], isLoading } = useQuery({
    queryKey: ["saved_posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc("get_saved_posts", { p_viewer_id: user.id, p_limit: 100 });
      if (error) { console.error("get_saved_posts error:", error); return []; }
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h2 className="text-lg font-bold">{t("saved.title")}</h2>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : savedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <BookmarkX className="h-12 w-12 text-muted-foreground mb-3" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-foreground mb-1">{t("saved.nothing")}</p>
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => navigate("/")}>{t("saved.go_home")}</Button>
        </div>
      ) : (
        savedPosts.map((post: any) => (
          <PostCard key={post.id} {...post} />
        ))
      )}
    </div>
  );
}
