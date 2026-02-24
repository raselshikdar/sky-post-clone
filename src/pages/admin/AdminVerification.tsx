import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BadgeCheck, Search, X } from "lucide-react";

export default function AdminVerification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: verified = [] } = useQuery({
    queryKey: ["admin_verified"],
    queryFn: async () => {
      const { data } = await supabase.from("verified_users").select("*");
      return data || [];
    },
  });

  const verifiedIds = new Set(verified.map((v: any) => v.user_id));

  const { data: users = [] } = useQuery({
    queryKey: ["admin_verify_search", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase.from("profiles").select("*").or(`username.ilike.%${search}%,display_name.ilike.%${search}%`).limit(20);
      return data || [];
    },
    enabled: search.length > 1,
  });

  const { data: verifiedProfiles = [] } = useQuery({
    queryKey: ["admin_verified_profiles", verified],
    queryFn: async () => {
      const ids = verified.map((v: any) => v.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("profiles").select("*").in("id", ids);
      return data || [];
    },
    enabled: verified.length > 0,
  });

  const verifyMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("verified_users").insert({ user_id: userId, verified_by: user!.id });
    },
    onSuccess: () => {
      toast.success("User verified");
      queryClient.invalidateQueries({ queryKey: ["admin_verified"] });
    },
  });

  const unverifyMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("verified_users").delete().eq("user_id", userId);
    },
    onSuccess: () => {
      toast.success("Verification removed");
      queryClient.invalidateQueries({ queryKey: ["admin_verified"] });
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Blue Badge Verification</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search user to verify..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {search && users.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border bg-card mb-6">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              {verifiedIds.has(u.id) ? (
                <button onClick={() => unverifyMutation.mutate(u.id)} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </button>
              ) : (
                <button onClick={() => verifyMutation.mutate(u.id)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                  <BadgeCheck className="h-3 w-3" /> Verify
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Verified Users ({verifiedProfiles.length})</h3>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {verifiedProfiles.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No verified users yet</p>
        ) : (
          verifiedProfiles.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate flex items-center gap-1">{u.display_name} <BadgeCheck className="h-4 w-4 text-primary" /></p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <button onClick={() => unverifyMutation.mutate(u.id)} className="rounded-full border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
