import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminFeeds() {
  const queryClient = useQueryClient();
  const [editFeed, setEditFeed] = useState<any>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "compass", color: "bg-primary" });

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ["admin_feeds"],
    queryFn: async () => {
      const { data } = await supabase.from("feeds").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openCreate = () => {
    setForm({ name: "", slug: "", description: "", icon: "compass", color: "bg-primary" });
    setEditFeed("new");
  };

  const openEdit = (feed: any) => {
    setForm({ name: feed.name, slug: feed.slug, description: feed.description || "", icon: feed.icon || "compass", color: feed.color || "bg-primary" });
    setEditFeed(feed);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editFeed === "new") {
        await supabase.from("feeds").insert(form as any);
      } else {
        await supabase.from("feeds").update(form as any).eq("id", editFeed.id);
      }
    },
    onSuccess: () => {
      toast.success(editFeed === "new" ? "Feed created" : "Feed updated");
      queryClient.invalidateQueries({ queryKey: ["admin_feeds"] });
      setEditFeed(null);
    },
    onError: () => toast.error("Failed to save feed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("feeds").delete().eq("id", id);
    },
    onSuccess: () => {
      toast.success("Feed deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_feeds"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Feed Management</h2>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Feed
        </button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : feeds.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No feeds yet</p>
        ) : (
          feeds.map((feed: any) => (
            <div key={feed.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{feed.name}</p>
                <p className="text-xs text-muted-foreground">/{feed.slug} · {feed.liked_count || 0} likes</p>
              </div>
              <button onClick={() => openEdit(feed)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => deleteMutation.mutate(feed.id)} className="rounded-full border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editFeed} onOpenChange={(v) => !v && setEditFeed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFeed === "new" ? "Create Feed" : "Edit Feed"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Feed name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Slug (url-friendly)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || !form.slug.trim()}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {editFeed === "new" ? "Create" : "Save Changes"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
