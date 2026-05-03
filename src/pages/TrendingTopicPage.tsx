import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import { ArrowLeft, TrendingUp, MoreHorizontal } from "lucide-react";
import TrendingTopicInfoDialog from "@/components/TrendingTopicInfoDialog";
import { devValidateRpcPayload } from "@/lib/postShape";

export default function TrendingTopicPage() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["trending_topic_posts", topic, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_posts_by_search", {
        p_pattern: `%${topic}%`,
        p_viewer_id: user?.id ?? null,
        p_limit: 50,
      });
      if (error) { console.error("get_posts_by_search error:", error); return []; }
      const list = (data as any[]) || [];
      devValidateRpcPayload("get_posts_by_search (Trending)", list, "flat");
      return list;
    },
    enabled: !!topic,
  });

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-lg font-bold truncate">{topic}</h2>
        </div>
        <button onClick={() => setInfoOpen(true)} className="rounded-full p-1.5 transition-colors hover:bg-accent">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div>{Array.from({ length: 5 }).map((_, i) => <PostCardSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No posts found for "{topic}"</p>
      ) : (
        posts.map((post: any) => <PostCard key={post.id} {...post} />)
      )}

      {topic && <TrendingTopicInfoDialog open={infoOpen} onOpenChange={setInfoOpen} topicName={topic} />}
    </div>
  );
}
