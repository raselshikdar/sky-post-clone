import { useState } from "react";
import { ArrowLeft, Plus, List, Users, Trash2, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function Lists() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState("");

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["lists", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lists")
        .select("*, list_members(id, user_id)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["list_members", selectedList],
    queryFn: async () => {
      const { data } = await supabase
        .from("list_members")
        .select("*, profiles:user_id(id, username, display_name, avatar_url)")
        .eq("list_id", selectedList!);
      return data || [];
    },
    enabled: !!selectedList,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["search_users_for_list", searchUser],
    queryFn: async () => {
      if (!searchUser.trim()) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${searchUser}%,display_name.ilike.%${searchUser}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchUser.length > 1,
  });

  const createList = useMutation({
    mutationFn: async () => {
      if (!user || !name.trim()) return;
      await supabase.from("lists").insert({ user_id: user.id, name: name.trim(), description: description.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      toast.success("List created");
    },
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      await supabase.from("lists").delete().eq("id", listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      setSelectedList(null);
      toast.success("List deleted");
    },
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedList) return;
      const { error } = await supabase.from("list_members").insert({ list_id: selectedList, user_id: userId });
      if (error?.code === "23505") { toast.info("Already in list"); return; }
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list_members", selectedList] });
      setSearchUser("");
      toast.success("Member added");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      await supabase.from("list_members").delete().eq("id", memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list_members", selectedList] });
      toast.success("Member removed");
    },
  });

  const selectedListData = lists.find((l: any) => l.id === selectedList);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => selectedList ? setSelectedList(null) : navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">{selectedList ? selectedListData?.name || "List" : "Lists"}</h2>
        {!selectedList ? (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteList.mutate(selectedList)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!selectedList ? (
        <>
          {/* Lists */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="flex flex-col items-center gap-1 mb-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-2xl">○ —</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-2xl">○ —</span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">Lists allow you to see content from your favorite people.</p>
            </div>
          ) : (
            <div className="border-t border-border">
              {lists.map((list: any) => (
                <button
                  key={list.id}
                  className="flex w-full items-center gap-4 px-4 py-4 bsky-hover border-b border-border"
                  onClick={() => setSelectedList(list.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[15px] text-foreground">{list.name}</p>
                    <p className="text-sm text-muted-foreground">{list.list_members?.length || 0} members</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* List detail: add members */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users to add..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-9 rounded-lg bg-accent border-none"
              />
            </div>
            {searchResults.length > 0 && searchUser && (
              <div className="mt-2 rounded-lg border border-border bg-background shadow-lg">
                {searchResults.map((u: any) => (
                  <button
                    key={u.id}
                    className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-accent"
                    onClick={() => addMember.mutate(u.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{u.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    <Plus className="ml-auto h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Members list */}
          {members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No members yet. Search and add users above.</div>
          ) : (
            members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/profile/${m.profiles?.username}`)}>
                  <AvatarImage src={m.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">{m.profiles?.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.profiles?.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{m.profiles?.username}</p>
                </div>
                <button onClick={() => removeMember.mutate(m.id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </>
      )}

      {/* Create list dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create user list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">List name</label>
              <Input placeholder="e.g. Great Posters" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">List description</label>
              <Textarea placeholder="e.g. The posters who never miss." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createList.mutate()} disabled={!name.trim()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
