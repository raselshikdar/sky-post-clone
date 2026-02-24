import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  BellOff, Bell, ShieldAlert, Ban, Shield, Trash2, Timer,
  Lock, X, AlertTriangle
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";

interface ConversationOptionsProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  otherUserId: string;
  otherUsername: string;
}

export default function ConversationOptions({
  open, onOpenChange, conversationId, otherUserId, otherUsername
}: ConversationOptionsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [disappearTime, setDisappearTime] = useState<number | null>(null);

  // Check if muted
  const { data: isMuted } = useQuery({
    queryKey: ["muted_conversation", conversationId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("muted_conversations")
        .select("id")
        .eq("user_id", user!.id)
        .eq("conversation_id", conversationId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && open,
  });

  // Check if blocked
  const { data: isBlocked } = useQuery({
    queryKey: ["blocked_account", otherUserId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_accounts")
        .select("id")
        .eq("user_id", user!.id)
        .eq("blocked_user_id", otherUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && open,
  });

  // Check if restricted
  const { data: isRestricted } = useQuery({
    queryKey: ["restricted_account", otherUserId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("restricted_accounts")
        .select("id")
        .eq("user_id", user!.id)
        .eq("restricted_user_id", otherUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && open,
  });

  // Get disappear setting
  const { data: conversation } = useQuery({
    queryKey: ["conversation_settings", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("disappear_after, is_encrypted")
        .eq("id", conversationId)
        .single();
      return data;
    },
    enabled: open,
  });

  const toggleMute = useMutation({
    mutationFn: async () => {
      if (isMuted) {
        await supabase.from("muted_conversations").delete()
          .eq("user_id", user!.id).eq("conversation_id", conversationId);
      } else {
        await supabase.from("muted_conversations").insert({
          user_id: user!.id, conversation_id: conversationId
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muted_conversation", conversationId] });
      toast.success(isMuted ? "Chat unmuted" : "Chat muted");
    },
  });

  const toggleBlock = useMutation({
    mutationFn: async () => {
      if (isBlocked) {
        await supabase.from("blocked_accounts").delete()
          .eq("user_id", user!.id).eq("blocked_user_id", otherUserId);
      } else {
        await supabase.from("blocked_accounts").insert({
          user_id: user!.id, blocked_user_id: otherUserId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked_account", otherUserId] });
      toast.success(isBlocked ? `@${otherUsername} unblocked` : `@${otherUsername} blocked`);
      if (!isBlocked) { onOpenChange(false); navigate("/messages"); }
    },
  });

  const toggleRestrict = useMutation({
    mutationFn: async () => {
      if (isRestricted) {
        await supabase.from("restricted_accounts").delete()
          .eq("user_id", user!.id).eq("restricted_user_id", otherUserId);
      } else {
        await supabase.from("restricted_accounts").insert({
          user_id: user!.id, restricted_user_id: otherUserId
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restricted_account", otherUserId] });
      toast.success(isRestricted ? "Restriction removed" : `@${otherUsername} restricted`);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async () => {
      await supabase.from("conversation_deletions").insert({
        user_id: user!.id, conversation_id: conversationId
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted");
      onOpenChange(false);
      navigate("/messages");
    },
  });

  const reportUser = useMutation({
    mutationFn: async () => {
      await supabase.from("account_reports").insert({
        reporter_id: user!.id, reported_user_id: otherUserId, reason: "inappropriate_messages"
      });
    },
    onSuccess: () => {
      toast.success("Report submitted");
      setConfirmAction(null);
    },
  });

  const setDisappearing = useMutation({
    mutationFn: async (seconds: number | null) => {
      await supabase.from("conversations").update({
        disappear_after: seconds
      } as any).eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation_settings", conversationId] });
      toast.success(disappearTime ? "Disappearing messages enabled" : "Disappearing messages disabled");
      setConfirmAction(null);
    },
  });

  const toggleEncryption = useMutation({
    mutationFn: async () => {
      await supabase.from("conversations").update({
        is_encrypted: !(conversation?.is_encrypted)
      } as any).eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation_settings", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      toast.success(conversation?.is_encrypted ? "Encryption disabled" : "End-to-end encryption enabled");
    },
  });

  const disappearOptions = [
    { label: "Off", value: null },
    { label: "24 hours", value: 86400 },
    { label: "7 days", value: 604800 },
    { label: "30 days", value: 2592000 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg">Chat Options</SheetTitle>
        </SheetHeader>

        {confirmAction === "delete" ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-semibold">Delete this conversation?</p>
            </div>
            <p className="text-sm text-muted-foreground">This will remove the conversation from your list. The other person can still see it.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium">Cancel</button>
              <button onClick={() => deleteConversation.mutate()} className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-medium">Delete</button>
            </div>
          </div>
        ) : confirmAction === "report" ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <p className="font-semibold">Report @{otherUsername}?</p>
            </div>
            <p className="text-sm text-muted-foreground">This will flag the user for review. You can also restrict or block them.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium">Cancel</button>
              <button onClick={() => reportUser.mutate()} className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2.5 text-sm font-medium">Report</button>
            </div>
          </div>
        ) : confirmAction === "disappear" ? (
          <div className="py-4 space-y-3">
            <p className="font-semibold flex items-center gap-2"><Timer className="h-5 w-5" /> Disappearing Messages</p>
            <p className="text-sm text-muted-foreground">Messages will auto-delete after the selected time.</p>
            <div className="space-y-2">
              {disappearOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setDisappearTime(opt.value);
                    setDisappearing.mutate(opt.value);
                  }}
                  className={`w-full rounded-lg px-4 py-3 text-sm text-left transition-colors ${
                    (conversation?.disappear_after ?? null) === opt.value
                      ? "bg-primary/10 text-primary font-medium border border-primary/30"
                      : "border border-border hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setConfirmAction(null)} className="w-full rounded-lg border border-border py-2.5 text-sm font-medium mt-2">Back</button>
          </div>
        ) : (
          <div className="py-2 space-y-1">
            {/* Mute */}
            <button onClick={() => toggleMute.mutate()} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              {isMuted ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              <div>
                <p className="font-medium text-sm">{isMuted ? "Unmute chat" : "Mute chat"}</p>
                <p className="text-xs text-muted-foreground">{isMuted ? "Re-enable notifications" : "Silence notifications for this chat"}</p>
              </div>
            </button>

            {/* Restrict */}
            <button onClick={() => toggleRestrict.mutate()} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              <ShieldAlert className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">{isRestricted ? "Remove restriction" : "Restrict"}</p>
                <p className="text-xs text-muted-foreground">{isRestricted ? "Allow normal messaging" : "Messages go to requests"}</p>
              </div>
            </button>

            {/* Block */}
            <button onClick={() => toggleBlock.mutate()} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              <Ban className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm text-destructive">{isBlocked ? "Unblock" : "Block"} @{otherUsername}</p>
                <p className="text-xs text-muted-foreground">{isBlocked ? "Allow messaging again" : "Prevent all messages"}</p>
              </div>
            </button>

            {/* Report */}
            <button onClick={() => setConfirmAction("report")} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm text-destructive">Report @{otherUsername}</p>
                <p className="text-xs text-muted-foreground">Flag for inappropriate messages</p>
              </div>
            </button>

            {/* Disappearing messages */}
            <button onClick={() => setConfirmAction("disappear")} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              <Timer className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Disappearing messages</p>
                <p className="text-xs text-muted-foreground">
                  {conversation?.disappear_after
                    ? `Auto-delete after ${conversation.disappear_after === 86400 ? "24 hours" : conversation.disappear_after === 604800 ? "7 days" : "30 days"}`
                    : "Off"}
                </p>
              </div>
            </button>

            {/* E2E Encryption */}
            <button onClick={() => toggleEncryption.mutate()} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">End-to-end encryption</p>
                <p className="text-xs text-muted-foreground">
                  {conversation?.is_encrypted ? "Enabled — messages are encrypted" : "Enable encrypted messaging"}
                </p>
              </div>
            </button>

            {/* Delete */}
            <button onClick={() => setConfirmAction("delete")} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-accent transition-colors">
              <Trash2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-sm text-destructive">Delete conversation</p>
                <p className="text-xs text-muted-foreground">Remove from your chat list</p>
              </div>
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
