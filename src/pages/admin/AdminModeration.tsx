import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Eye, Flag } from "lucide-react";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminModeration() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: postReports = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin_post_reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*, reporter:profiles!reports_reporter_id_fkey(username, display_name), post:posts!reports_post_id_fkey(id, content, author_id)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: accountReports = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["admin_account_reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("account_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: reportedProfiles = {} } = useQuery({
    queryKey: ["admin_reported_profiles", accountReports],
    queryFn: async () => {
      const ids = [...new Set(accountReports.flatMap((r: any) => [r.reported_user_id, r.reporter_id]))];
      if (ids.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: accountReports.length > 0,
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("posts").delete().eq("id", postId);
    },
    onSuccess: () => {
      toast.success("Post removed");
      queryClient.invalidateQueries({ queryKey: ["admin_post_reports"] });
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Content Moderation</h2>
      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Post Reports ({postReports.length})</TabsTrigger>
          <TabsTrigger value="accounts">Account Reports ({accountReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingPosts ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : postReports.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Flag className="h-8 w-8 mb-2" />
                <p>No post reports</p>
              </div>
            ) : (
              postReports.map((r: any) => (
                <div key={r.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-semibold">@{r.reporter?.username}</span>
                      <span className="text-muted-foreground"> reported · {timeAgo(r.created_at)}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/post/${r.post?.id}`)}
                        className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deletePostMutation.mutate(r.post?.id)}
                        className="rounded-full border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                  <p className="text-sm line-clamp-2 text-foreground">{r.post?.content}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingAccounts ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : accountReports.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Flag className="h-8 w-8 mb-2" />
                <p>No account reports</p>
              </div>
            ) : (
              accountReports.map((r: any) => {
                const reported = (reportedProfiles as any)[r.reported_user_id];
                const reporter = (reportedProfiles as any)[r.reporter_id];
                return (
                  <div key={r.id} className="px-4 py-3">
                    <p className="text-sm">
                      <span className="font-semibold">@{reporter?.username || "unknown"}</span>
                      <span className="text-muted-foreground"> reported </span>
                      <span className="font-semibold">@{reported?.username || "unknown"}</span>
                      <span className="text-muted-foreground"> · {timeAgo(r.created_at)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Reason: {r.reason}</p>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
