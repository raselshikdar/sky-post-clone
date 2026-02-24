import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Shield, ShieldCheck, X } from "lucide-react";

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["admin_all_roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const roleMap: Record<string, string[]> = {};
  roles.forEach((r: any) => {
    if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
    roleMap[r.user_id].push(r.role);
  });

  const staffIds = [...new Set(roles.map((r: any) => r.user_id))];

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["admin_staff_profiles", staffIds],
    queryFn: async () => {
      if (staffIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("*").in("id", staffIds);
      return data || [];
    },
    enabled: staffIds.length > 0,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["admin_role_search", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase.from("profiles").select("*").or(`username.ilike.%${search}%,display_name.ilike.%${search}%`).limit(10);
      return data || [];
    },
    enabled: search.length > 1,
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").insert({ user_id: userId, role } as any);
    },
    onSuccess: () => {
      toast.success("Role assigned");
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
    },
    onError: () => toast.error("Failed - may already have this role"),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    },
    onSuccess: () => {
      toast.success("Role removed");
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Role Management</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search user to assign role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {search && searchResults.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border bg-card mb-6">
          {searchResults.map((u: any) => {
            const userRoles = roleMap[u.id] || [];
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <div className="flex gap-1.5">
                  {!userRoles.includes("admin") && (
                    <button onClick={() => addRoleMutation.mutate({ userId: u.id, role: "admin" })} className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium hover:bg-accent">
                      + Admin
                    </button>
                  )}
                  {!userRoles.includes("moderator") && (
                    <button onClick={() => addRoleMutation.mutate({ userId: u.id, role: "moderator" })} className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium hover:bg-accent">
                      + Mod
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Staff Members ({staffProfiles.length})</h3>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {staffProfiles.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No staff members</p>
        ) : (
          staffProfiles.map((u: any) => {
            const userRoles = roleMap[u.id] || [];
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <div className="flex gap-1.5">
                  {userRoles.map((role) => (
                    <span key={role} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                      {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                      {role}
                      <button onClick={() => removeRoleMutation.mutate({ userId: u.id, role })} className="ml-0.5 hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
