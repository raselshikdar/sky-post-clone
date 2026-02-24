import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";

export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversation details
  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId!)
        .single();
      if (!data) return null;

      const otherId = data.participant_1 === user!.id ? data.participant_2 : data.participant_1;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", otherId)
        .single();

      return { ...data, otherUser: profile };
    },
    enabled: !!conversationId && !!user,
  });

  // Get messages
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!conversationId,
  });

  // Mark messages as read + delivered
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) return;
    const otherMsgs = messages.filter((m: any) => m.sender_id !== user.id);
    const unread = otherMsgs.filter((m: any) => !m.read);
    const undelivered = otherMsgs.filter((m: any) => !m.delivered);

    const updates: PromiseLike<any>[] = [];

    if (unread.length > 0) {
      updates.push(
        supabase
          .from("messages")
          .update({ read: true, delivered: true } as any)
          .eq("conversation_id", conversationId)
          .neq("sender_id", user.id)
          .eq("read", false)
          .then()
      );
    } else if (undelivered.length > 0) {
      updates.push(
        supabase
          .from("messages")
          .update({ delivered: true } as any)
          .eq("conversation_id", conversationId)
          .neq("sender_id", user.id)
          .eq("delivered", false)
          .then()
      );
    }

    if (updates.length > 0) {
      Promise.all(updates).then(() => {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      });
    }
  }, [messages, user, conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string, imageFile?: File) => {
    if (!user || !conversationId) return;

    let imageUrl: string | undefined;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, imageFile);
      if (error) {
        console.error("Upload error:", error);
        return;
      }
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content || "",
      image_url: imageUrl || null,
    } as any);

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  if (!conversation) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  const otherUser = conversation.otherUser;

  // Group messages by date
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg: any) => {
    const date = new Date(msg.created_at).toLocaleDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-49px)] lg:h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm flex-shrink-0">
        <button onClick={() => navigate("/messages")} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate(`/profile/${otherUser?.username}`)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUser?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {otherUser?.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-bold text-[15px] truncate">{otherUser?.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{otherUser?.username}</p>
          </div>
        </button>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {otherUser?.display_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-bold text-lg">{otherUser?.display_name}</p>
            <p className="text-sm text-muted-foreground">@{otherUser?.username}</p>
            <p className="mt-2 text-sm text-muted-foreground">This is the beginning of your conversation</p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-4">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>
            {group.msgs.map((msg: any) => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                imageUrl={msg.image_url}
                isMine={msg.sender_id === user?.id}
                time={new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                delivered={msg.delivered}
                read={msg.read}
              />
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed chat input */}
      <div className="flex-shrink-0">
        <ChatInput onSend={handleSend} sending={false} />
      </div>
    </div>
  );
}
