import { useState } from "react";
import { Search, X, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

export default function SharePostDialog({ open, onOpenChange, postId }: SharePostDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  // Fetch existing conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations_for_share", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      
      if (!data || data.length === 0) return [];
      
      const otherIds = data.map((c: any) => 
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      );
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherIds);
      
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
      
      return data.map((c: any) => {
        const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        return { ...c, otherUser: profileMap[otherId] };
      });
    },
    enabled: !!user && open,
  });

  // Fetch users for new conversations
  const { data: users = [] } = useQuery({
    queryKey: ["share_search_users", search],
    queryFn: async () => {
      if (!user) return [];
      if (search.length < 1) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .neq("id", user.id)
          .limit(20);
        return data || [];
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user.id)
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(20);
      return data || [];
    },
    enabled: !!user && open,
  });

  // Chat settings for permission checking
  const { data: chatSettings = [] } = useQuery({
    queryKey: ["chat_settings_all"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_settings").select("user_id, allow_messages_from");
      return data || [];
    },
    enabled: open,
  });
  
  const settingsMap: Record<string, string> = {};
  chatSettings.forEach((s: any) => { settingsMap[s.user_id] = s.allow_messages_from; });
  
  const { data: myFollowing = [] } = useQuery({
    queryKey: ["my_following_ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      return (data || []).map((f: any) => f.following_id);
    },
    enabled: !!user && open,
  });

  const canMessage = (targetUserId: string) => {
    const setting = settingsMap[targetUserId] || "everyone";
    if (setting === "everyone") return true;
    if (setting === "following") return myFollowing.includes(targetUserId);
    if (setting === "no_one") return false;
    return true;
  };

  const sendToConversation = async (conversationId: string) => {
    if (!user) return;
    
    const postUrl = `${window.location.origin}/post/${postId}`;
    
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: postUrl,
    });
    
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Post shared!");
    onOpenChange(false);
    navigate(`/messages/${conversationId}`);
  };

  const sendToUser = async (targetUserId: string) => {
    if (!user) return;
    
    // Check for existing conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${user.id})`)
      .maybeSingle();
    
    if (existing) {
      await sendToConversation(existing.id);
      return;
    }
    
    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ participant_1: user.id, participant_2: targetUserId })
      .select("id")
      .single();
    
    if (error) {
      toast.error("Failed to send");
      return;
    }
    
    await sendToConversation(newConv.id);
  };

  // Filter existing conversations by search
  const filteredConversations = conversations.filter((conv: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = conv.otherUser?.display_name?.toLowerCase() || "";
    const username = conv.otherUser?.username?.toLowerCase() || "";
    return name.includes(q) || username.includes(q);
  });

  // Get conversation user IDs to filter them from users list
  const conversationUserIds = new Set(conversations.map((c: any) => c.otherUser?.id));
  const filteredUsers = users.filter((u: any) => !conversationUserIds.has(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold">Send via direct message</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              placeholder={t("nav.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-none bg-transparent text-base focus-visible:ring-0 placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh]">
          {/* Existing conversations */}
          {filteredConversations.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Recent conversations</p>
              {filteredConversations.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => sendToConversation(conv.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 cursor-pointer"
                >
                  <Avatar className="h-11 w-11 flex-shrink-0">
                    <AvatarImage src={conv.otherUser?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {conv.otherUser?.display_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate">{conv.otherUser?.display_name}</p>
                    <p className="text-sm text-muted-foreground truncate">@{conv.otherUser?.username}</p>
                  </div>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          
          {/* Other users (not in existing conversations) */}
          {filteredUsers.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">All users</p>
              {filteredUsers.map((u: any) => {
                const messageable = canMessage(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => messageable && sendToUser(u.id)}
                    disabled={!messageable}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${messageable ? "hover:bg-accent/50 cursor-pointer" : "opacity-60 cursor-default"}`}
                  >
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {u.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-[15px] truncate ${!messageable ? "text-muted-foreground" : ""}`}>
                        {u.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{u.username}{!messageable && ` · ${t("msg.cant_message")}`}
                      </p>
                    </div>
                    {messageable && <Send className="h-4 w-4 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          )}
          
          {filteredConversations.length === 0 && filteredUsers.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">{t("msg.no_users")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
