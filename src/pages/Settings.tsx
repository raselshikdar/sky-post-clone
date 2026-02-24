import { useState, useEffect } from "react";
import {
  ChevronRight, User, Shield, Bell, Palette, Eye, VolumeX, UserX, LogOut,
  ChevronLeft, BadgeCheck, HelpCircle, Globe, Accessibility, FileText, Info,
  ShieldCheck, Lock, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";

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
    <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <button onClick={() => setSection(null)} className="p-1 rounded-full hover:bg-accent">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );

  // Sub-sections
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

  if (section === "moderation") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Moderation")}
        <ScrollArea className="flex-1">
          <div className="py-2">
            <SettingsRow icon={VolumeX} label="Muted Accounts" onClick={() => setSection("muted")} />
            <SettingsRow icon={UserX} label="Blocked Accounts" onClick={() => setSection("blocked")} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Main settings page
  const mainItems = [
    { label: "Account", icon: User, action: () => setSection("account") },
    { label: "Privacy and security", icon: Lock, action: () => setSection("moderation") },
    { label: "Moderation", icon: ShieldCheck, action: () => setSection("moderation") },
    { label: "Notifications", icon: Bell, action: () => navigate("/notifications/settings") },
    { label: "Content and media", icon: FileText, action: () => navigate("/feeds/settings") },
    { label: "Appearance", icon: Palette, action: () => {} },
    { label: "Accessibility", icon: Accessibility, action: () => {} },
    { label: "Languages", icon: Globe, action: () => {} },
    { label: "Apply for Verification", icon: BadgeCheck, action: () => navigate("/verification/apply") },
    { label: "Help", icon: HelpCircle, action: () => navigate("/support") },
    { label: "About", icon: Info, action: () => {} },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">Settings</h2>
      </div>

      <ScrollArea className="flex-1">
        {/* Profile card */}
        <div className="flex flex-col items-center py-6 border-b border-border">
          <Avatar className="h-20 w-20 cursor-pointer" onClick={() => navigate(`/profile/${profile?.username}`)}>
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile?.display_name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-3 text-lg font-bold text-foreground flex items-center gap-1">
            {profile?.display_name || "User"}
            {user && <VerifiedBadge userId={user.id} className="h-4 w-4" />}
          </h3>
          <p className="text-sm text-muted-foreground">@{profile?.username || "handle"}</p>
        </div>

        {/* Menu items */}
        <div className="py-2">
          {mainItems.map(({ label, icon: Icon, action }) => (
            <SettingsRow key={label} icon={Icon} label={label} onClick={action} />
          ))}
        </div>

        <div className="border-t border-border" />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive hover:bg-accent transition-colors"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[15px] font-medium">Sign out</span>
        </button>

        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-[15px] font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
