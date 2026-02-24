import { useState, useEffect } from "react";
import { ChevronRight, User, Shield, Bell, Palette, Eye, VolumeX, UserX, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MutedAccount { id: string; muted_user_id: string; profiles?: { username: string; display_name: string } }
interface BlockedAccount { id: string; blocked_user_id: string; profiles?: { username: string; display_name: string } }

export default function SettingsPage() {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<string | null>(null);
  const [mutedAccounts, setMutedAccounts] = useState<MutedAccount[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  useEffect(() => {
    if (!user) return;
    if (section === "muted") {
      supabase.from("muted_accounts").select("id, muted_user_id, profiles:profiles!muted_accounts_muted_user_id_fkey(username, display_name)").eq("user_id", user.id).then(({ data }) => {
        setMutedAccounts((data as any) || []);
      });
    }
    if (section === "blocked") {
      supabase.from("blocked_accounts").select("id, blocked_user_id, profiles:profiles!blocked_accounts_blocked_user_id_fkey(username, display_name)").eq("user_id", user.id).then(({ data }) => {
        setBlockedAccounts((data as any) || []);
      });
    }
  }, [section, user]);

  const handleUnmute = async (id: string) => {
    await supabase.from("muted_accounts").delete().eq("id", id);
    setMutedAccounts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Account unmuted");
  };

  const handleUnblock = async (id: string) => {
    await supabase.from("blocked_accounts").delete().eq("id", id);
    setBlockedAccounts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Account unblocked");
  };

  const renderBack = (title: string) => (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <button onClick={() => setSection(null)} className="p-1 rounded-full hover:bg-accent">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );

  if (section === "account") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Account")}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Display name</p>
              <p className="font-medium">{profile?.display_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-medium">@{profile?.username}</p>
            </div>
            <Button variant="outline" className="w-full rounded-full" onClick={() => navigate(`/profile/${profile?.username}`)}>
              Edit Profile
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (section === "muted") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Muted Accounts")}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {mutedAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No muted accounts</p>
            ) : (
              mutedAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
                  <div>
                    <p className="font-medium">{(a.profiles as any)?.display_name || "User"}</p>
                    <p className="text-sm text-muted-foreground">@{(a.profiles as any)?.username || "unknown"}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleUnmute(a.id)}>
                    Unmute
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (section === "blocked") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Blocked Accounts")}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {blockedAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No blocked accounts</p>
            ) : (
              blockedAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
                  <div>
                    <p className="font-medium">{(a.profiles as any)?.display_name || "User"}</p>
                    <p className="text-sm text-muted-foreground">@{(a.profiles as any)?.username || "unknown"}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleUnblock(a.id)}>
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  const settingsItems = [
    { label: "Account", icon: User, key: "account" },
    { label: "Muted Accounts", icon: VolumeX, key: "muted" },
    { label: "Blocked Accounts", icon: UserX, key: "blocked" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <h2 className="text-lg font-bold">Settings</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {settingsItems.map(({ label, icon: Icon, key }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[15px] font-medium">{label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <div className="border-t border-border my-2" />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive hover:bg-accent transition-colors"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[15px] font-medium">Sign Out</span>
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
