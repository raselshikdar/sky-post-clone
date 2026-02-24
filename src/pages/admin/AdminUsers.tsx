import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ban, Search, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [suspendDialog, setSuspendDialog] = useState<any>(null);
  const [reason, setReason] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      if (search) query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: suspensions = [] } = useQuery({
    queryKey: ["admin_suspensions"],
    queryFn: async () => {
      const { data } = await supabase.from("user_suspensions").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const suspendedIds = new Set(suspensions.map((s: any) => s.user_id));

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await supabase.from("user_suspensions").insert({
        user_id: userId,
        reason,
        suspended_by: user!.id,
      });
    },
    onSuccess: () => {
      toast.success("User suspended");
      queryClient.invalidateQueries({ queryKey: ["admin_suspensions"] });
      setSuspendDialog(null);
      setReason("");
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_suspensions").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    },
    onSuccess: () => {
      toast.success("User unsuspended");
      queryClient.invalidateQueries({ queryKey: ["admin_suspensions"] });
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No users found</p>
        ) : (
          users.map((u: any) => {
            const isSuspended = suspendedIds.has(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {u.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {isSuspended ? (
                  <button
                    onClick={() => unsuspendMutation.mutate(u.id)}
                    className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    <ShieldOff className="h-3 w-3" /> Unsuspend
                  </button>
                ) : u.id !== user?.id ? (
                  <button
                    onClick={() => setSuspendDialog(u)}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                  >
                    <Ban className="h-3 w-3" /> Suspend
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={!!suspendDialog} onOpenChange={(v) => !v && setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend @{suspendDialog?.username}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Reason for suspension..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <button
            onClick={() => suspendMutation.mutate({ userId: suspendDialog.id, reason })}
            disabled={!reason.trim()}
            className="w-full rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            Confirm Suspension
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
