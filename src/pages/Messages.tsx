import { useState } from "react";
import { MessageCircle, Settings, Search, X, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MobileDrawer from "@/components/MobileDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { timeAgo } from "@/lib/time";
import ConversationSkeleton from "@/components/ConversationSkeleton";
import { useTranslation } from "@/i18n/LanguageContext";

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("conversations").select("*").or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`).order("last_message_at", { ascending: false });
      if (!data || data.length === 0) return [];
      const convIds = data.map((c: any) => c.id);
      const { data: deletions } = await supabase.from("conversation_deletions").select("conversation_id").eq("user_id", user.id).in("conversation_id", convIds);
      const deletedIds = new Set((deletions || []).map((d: any) => d.conversation_id));
      const { data: blocks } = await supabase.from("blocked_accounts").select("blocked_user_id").eq("user_id", user.id);
      const blockedIds = new Set((blocks || []).map((b: any) => b.blocked_user_id));
      const filteredData = data.filter((c: any) => { if (deletedIds.has(c.id)) return false; const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1; return !blockedIds.has(otherId); });
      if (filteredData.length === 0) return [];
      const otherIds = filteredData.map((c: any) => c.participant_1 === user.id ? c.participant_2 : c.participant_1);
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds);
      const profileMap: Record<string, any> = {}; (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      const filteredIds = filteredData.map((c: any) => c.id);
      const { data: lastMessages } = await supabase.from("messages").select("conversation_id, content, sender_id, created_at").in("conversation_id", filteredIds).order("created_at", { ascending: false });
      const lastMsgMap: Record<string, any> = {}; (lastMessages || []).forEach((m: any) => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m; });
      const { data: unreadMessages } = await supabase.from("messages").select("conversation_id").in("conversation_id", filteredIds).neq("sender_id", user.id).eq("read", false);
      const unreadMap: Record<string, number> = {}; (unreadMessages || []).forEach((m: any) => { unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1; });
      return filteredData.map((c: any) => { const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1; return { ...c, otherUser: profileMap[otherId], lastMessage: lastMsgMap[c.id], unreadCount: unreadMap[c.id] || 0 }; });
    },
    enabled: !!user,
  });

  const isLoading = !user;

  return (
    <>
    <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1 lg:hidden"><Menu className="h-6 w-6 text-foreground" strokeWidth={2} /></button>
          <h2 className="text-xl font-bold">{t("msg.chats")}</h2>
        </div>
        <button onClick={() => navigate("/messages/settings")} className="text-muted-foreground hover:text-foreground"><Settings className="h-5 w-5" /></button>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("nav.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {(() => {
        const filtered = conversations.filter((conv: any) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          const name = conv.otherUser?.display_name?.toLowerCase() || "";
          const username = conv.otherUser?.username?.toLowerCase() || "";
          const msg = conv.lastMessage?.content?.toLowerCase() || "";
          return name.includes(q) || username.includes(q) || msg.includes(q);
        });
        if (filtered.length === 0 && !isLoading) return (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
            <MessageCircle className="h-16 w-16 text-primary" strokeWidth={1.5} />
            <h3 className="text-xl font-bold">{searchQuery ? t("msg.no_users") : t("msg.nothing_here")}</h3>
            {!searchQuery && <p className="text-muted-foreground text-center">{t("msg.no_conversations")}</p>}
          </div>
        );
        return (
        <div>
          {filtered.map((conv: any) => (
            <button key={conv.id} onClick={() => navigate(`/messages/${conv.id}`)} className="flex w-full items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent/50 text-left">
              <Avatar className="h-12 w-12 flex-shrink-0"><AvatarImage src={conv.otherUser?.avatar_url} /><AvatarFallback className="bg-primary text-primary-foreground">{conv.otherUser?.display_name?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[15px] truncate">{conv.otherUser?.display_name}</span>
                  {conv.lastMessage && <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(conv.lastMessage.created_at)}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage ? (conv.lastMessage.sender_id === user?.id ? t("msg.you") + " " : "") + conv.lastMessage.content : t("msg.no_messages")}
                  </p>
                  {conv.unreadCount > 0 && <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground flex-shrink-0">{conv.unreadCount}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
        );
      })()}

      <button onClick={() => setNewChatOpen(true)} className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 z-30">
        <MessageCircle className="h-6 w-6" fill="currentColor" />
      </button>
      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </div>
    </>
  );
}

function NewChatDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  const { data: users = [] } = useQuery({
    queryKey: ["chat_search_users", search],
    queryFn: async () => {
      if (!user || search.length < 1) {
        const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", user!.id).limit(20);
        return data || [];
      }
      const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", user!.id).or(`username.ilike.%${search}%,display_name.ilike.%${search}%`).limit(20);
      return data || [];
    },
    enabled: !!user && open,
  });

  const { data: chatSettings = [] } = useQuery({
    queryKey: ["chat_settings_all"],
    queryFn: async () => { const { data } = await supabase.from("chat_settings").select("user_id, allow_messages_from"); return data || []; },
    enabled: open,
  });
  const settingsMap: Record<string, string> = {}; chatSettings.forEach((s: any) => { settingsMap[s.user_id] = s.allow_messages_from; });
  const { data: myFollowing = [] } = useQuery({
    queryKey: ["my_following_ids", user?.id],
    queryFn: async () => { if (!user) return []; const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id); return (data || []).map((f: any) => f.following_id); },
    enabled: !!user && open,
  });

  const canMessage = (targetUserId: string) => {
    const setting = settingsMap[targetUserId] || "everyone";
    if (setting === "everyone") return true;
    if (setting === "following") return myFollowing.includes(targetUserId);
    if (setting === "no_one") return false;
    return true;
  };

  const startChat = async (targetUserId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("conversations").select("id").or(`and(participant_1.eq.${user.id},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${user.id})`).maybeSingle();
    if (existing) { onOpenChange(false); navigate(`/messages/${existing.id}`); return; }
    const { data: newConv, error } = await supabase.from("conversations").insert({ participant_1: user.id, participant_2: targetUserId }).select("id").single();
    if (error) { console.error(error); return; }
    queryClient.invalidateQueries({ queryKey: ["conversations"] }); onOpenChange(false); navigate(`/messages/${newConv.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold">{t("msg.start_chat")}</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input placeholder={t("nav.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-none bg-transparent text-base focus-visible:ring-0 placeholder:text-muted-foreground" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {users.map((u: any) => {
            const messageable = canMessage(u.id);
            return (
              <button key={u.id} onClick={() => messageable && startChat(u.id)} disabled={!messageable}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${messageable ? "hover:bg-accent/50 cursor-pointer" : "opacity-60 cursor-default"}`}>
                <Avatar className="h-11 w-11 flex-shrink-0"><AvatarImage src={u.avatar_url} /><AvatarFallback className="bg-primary text-primary-foreground">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className={`font-bold text-[15px] truncate ${!messageable ? "text-muted-foreground" : ""}`}>{u.display_name}</p>
                  <p className="text-sm text-muted-foreground truncate">@{u.username}{!messageable && ` ${t("msg.cant_message")}`}</p>
                </div>
              </button>
            );
          })}
          {users.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("msg.no_users")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
