import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BadgeCheck, Search, X, Clock, FileText, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminVerification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Existing verified users
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

  // Verification requests
  const { data: requests = [] } = useQuery({
    queryKey: ["admin_verification_requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const pendingRequests = requests.filter((r: any) => r.status === "pending");
  const processedRequests = requests.filter((r: any) => r.status !== "pending");

  // Get profiles for request users
  const requestUserIds = [...new Set(requests.map((r: any) => r.user_id))];
  const { data: requestProfiles = [] } = useQuery({
    queryKey: ["admin_request_profiles", requestUserIds],
    queryFn: async () => {
      if (requestUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("*").in("id", requestUserIds);
      return data || [];
    },
    enabled: requestUserIds.length > 0,
  });
  const profileMap = Object.fromEntries(requestProfiles.map((p: any) => [p.id, p]));

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

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, status, userId }: { requestId: string; status: string; userId: string }) => {
      await supabase.from("verification_requests").update({
        status,
        reviewed_by: user!.id,
        admin_notes: reviewNotes[requestId] || null,
      }).eq("id", requestId);

      if (status === "approved") {
        // Also add to verified_users
        await supabase.from("verified_users").upsert({ user_id: userId, verified_by: user!.id }, { onConflict: "user_id" });
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(status === "approved" ? "Request approved & user verified!" : "Request rejected");
      queryClient.invalidateQueries({ queryKey: ["admin_verification_requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin_verified"] });
    },
  });

  const getDocUrl = (path: string) => {
    const { data } = supabase.storage.from("verification-docs").getPublicUrl(path);
    return data.publicUrl;
  };

  const docTypeLabel = (t: string) => {
    if (t === "nid") return "National ID";
    if (t === "driving_license") return "Driving License";
    if (t === "passport") return "Passport";
    return t;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Blue Badge Verification</h2>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="requests" className="flex-1">
            Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">Manual Verify</TabsTrigger>
          <TabsTrigger value="verified" className="flex-1">Verified</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {pendingRequests.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((r: any) => {
                const profile = profileMap[r.user_id];
                return (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {profile?.display_name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{profile?.display_name || "User"}</p>
                        <p className="text-xs text-muted-foreground">@{profile?.username || "unknown"}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{docTypeLabel(r.document_type)}</span>
                      <a
                        href={getDocUrl(r.document_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline ml-auto"
                      >
                        View Document <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <Textarea
                      placeholder="Admin notes (optional)..."
                      value={reviewNotes[r.id] || ""}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      rows={2}
                      className="rounded-lg text-xs resize-none"
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-full"
                        onClick={() => reviewMutation.mutate({ requestId: r.id, status: "approved", userId: r.user_id })}
                        disabled={reviewMutation.isPending}
                      >
                        <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 rounded-full"
                        onClick={() => reviewMutation.mutate({ requestId: r.id, status: "rejected", userId: r.user_id })}
                        disabled={reviewMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {processedRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Processed ({processedRequests.length})</h3>
              <div className="space-y-2">
                {processedRequests.slice(0, 20).map((r: any) => {
                  const profile = profileMap[r.user_id];
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-muted text-xs">{profile?.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{profile?.display_name} · @{profile?.username}</p>
                      </div>
                      <span className={`text-xs font-medium ${r.status === "approved" ? "text-green-500" : "text-destructive"}`}>
                        {r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search user to verify..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {search && users.length > 0 && (
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
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
        </TabsContent>

        <TabsContent value="verified">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
