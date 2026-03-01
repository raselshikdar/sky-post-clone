import { useState, useEffect } from "react";
import {
  ChevronRight, User, Bell, Palette, LogOut,
  ChevronLeft, BadgeCheck, HelpCircle, Globe, Accessibility, FileText, Info,
  Lock, Sun, Moon, Monitor, Type, Mail, PenLine,
  AtSign, Cake, Download, XCircle, Trash2, CheckCircle2,
  VolumeX, UserX, Shield, Filter, Users, Ban, CheckCircle,
  Book, Wrench, Hash, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useTheme } from "next-themes";

interface MutedAccount { id: string; muted_user_id: string; profiles?: { username: string; display_name: string } }
interface BlockedAccount { id: string; blocked_user_id: string; profiles?: { username: string; display_name: string } }

export default function SettingsPage() {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const renderBack = (title: string, onBack?: () => void) => (
    <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <button onClick={onBack || (() => setSection(null))} className="p-1 rounded-full hover:bg-accent">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );

  if (section === "account") return <AccountSection renderBack={renderBack} setSection={setSection} />;
  if (section === "privacy") return <PrivacySection renderBack={renderBack} setSection={setSection} />;
  if (section === "moderation") return <ModerationSection renderBack={renderBack} setSection={setSection} />;
  if (section === "muted") return <MutedSection renderBack={renderBack} setSection={setSection} />;
  if (section === "blocked") return <BlockedSection renderBack={renderBack} setSection={setSection} />;
  if (section === "appearance") return <AppearanceSection renderBack={renderBack} />;
  if (section === "accessibility") return <AccessibilitySection renderBack={renderBack} />;
  if (section === "languages") return <LanguagesSection renderBack={renderBack} />;
  if (section === "about") return <AboutSection renderBack={renderBack} />;

  // === Main settings ===
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">Settings</h2>
      </div>

      <ScrollArea className="flex-1">
        {/* Profile header */}
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
          <p className="text-sm text-primary">@{profile?.username || "handle"}</p>
        </div>

        {/* Main items */}
        <div className="py-1 border-b border-border">
          <SettingsRow icon={User} label="Account" onClick={() => setSection("account")} />
          <SettingsRow icon={Lock} label="Privacy and security" onClick={() => setSection("privacy")} />
          <SettingsRow icon={Shield} label="Moderation" onClick={() => setSection("moderation")} />
          <SettingsRow icon={Bell} label="Notifications" onClick={() => navigate("/notifications/settings")} />
          <SettingsRow icon={FileText} label="Content and media" onClick={() => navigate("/feeds/settings")} />
          <SettingsRow icon={Palette} label="Appearance" onClick={() => setSection("appearance")} />
          <SettingsRow icon={Accessibility} label="Accessibility" onClick={() => setSection("accessibility")} />
          <SettingsRow icon={Globe} label="Languages" onClick={() => setSection("languages")} />
          <SettingsRow icon={HelpCircle} label="Help" onClick={() => navigate("/support")} />
          <SettingsRow icon={Info} label="About" onClick={() => setSection("about")} />
        </div>

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

// ===========================
// Account Section
// ===========================
function AccountSection({ renderBack, setSection }: { renderBack: (t: string, onBack?: () => void) => React.ReactNode; setSection: (s: string | null) => void }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [subSection, setSubSection] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [birthday, setBirthday] = useState("");
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNewHandle(profile.username || "");
      setBirthday((profile as any).birthday || "");
    }
  }, [profile]);

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmation email sent to your new address");
    setSubSection(null);
  };

  const handleUpdateHandle = async () => {
    const handle = newHandle.trim().toLowerCase();
    if (!handle || handle.length < 3) { toast.error("Username must be at least 3 characters"); return; }
    if (!/^[a-z0-9_]+$/.test(handle)) { toast.error("Only letters, numbers and underscores"); return; }
    if (handle === profile?.username) { setSubSection(null); return; }
    setSaving(true);
    const { data: existing } = await supabase.from("profiles").select("id").eq("username", handle).neq("id", user!.id).maybeSingle();
    if (existing) { setSaving(false); toast.error("Username already taken"); return; }
    const { error } = await supabase.from("profiles").update({ username: handle }).eq("id", user!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Handle updated");
    setSubSection(null);
  };

  const handleSaveBirthday = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ birthday: birthday || null } as any).eq("id", user!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Birthday updated");
    setEditingBirthday(false);
  };

  if (subSection === "update-email") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Update Email", () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Current: {user?.email}</p>
          <div className="space-y-2">
            <Label>New email address</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" />
          </div>
          <Button className="w-full rounded-full" disabled={saving || !newEmail.trim()} onClick={handleUpdateEmail}>
            {saving ? "Sending..." : "Update Email"}
          </Button>
        </div>
      </div>
    );
  }

  if (subSection === "handle") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Handle", () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Your current handle is <span className="font-medium text-foreground">@{profile?.username}</span></p>
          <div className="space-y-2">
            <Label>New handle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input className="pl-8" value={newHandle} onChange={(e) => setNewHandle(e.target.value.toLowerCase())} placeholder="username" />
            </div>
            <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only. Min 3 characters.</p>
          </div>
          <Button className="w-full rounded-full" disabled={saving || !newHandle.trim()} onClick={handleUpdateHandle}>
            {saving ? "Saving..." : "Save Handle"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {renderBack("Account", () => setSection(null))}
      <ScrollArea className="flex-1">
        {/* Email */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Email</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
              {user?.email_confirmed_at && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
          </div>
          <SettingsRow icon={PenLine} label="Update email" onClick={() => { setNewEmail(""); setSubSection("update-email"); }} />
        </div>

        {/* Password & Handle */}
        <div className="border-b border-border">
          <SettingsRow icon={Lock} label="Password" onClick={() => navigate("/reset-password")} />
          <SettingsRow icon={AtSign} label="Handle" onClick={() => setSubSection("handle")} />
          {/* Birthday */}
          <div className="flex items-center justify-between px-4 py-3.5 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <Cake className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Birthday</span>
            </div>
            {editingBirthday ? (
              <div className="flex items-center gap-2">
                <Input type="date" className="h-8 w-auto text-sm" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                <Button size="sm" variant="ghost" className="h-8 text-primary" disabled={saving} onClick={handleSaveBirthday}>
                  {saving ? "..." : "Save"}
                </Button>
              </div>
            ) : (
              <button onClick={() => setEditingBirthday(true)} className="text-sm font-medium text-primary">
                {birthday ? new Date(birthday + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Set"}
              </button>
            )}
          </div>
        </div>

        {/* Verification */}
        <div className="border-b border-border">
          <SettingsRow icon={BadgeCheck} label="Apply for verification" onClick={() => navigate("/verification/apply")} />
        </div>

        {/* Danger zone */}
        <div className="border-b border-border">
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors" onClick={() => toast.info("This feature is coming soon")}>
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Export my data</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors" onClick={() => toast.info("This feature is coming soon")}>
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-destructive">Deactivate account</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors" onClick={() => toast.info("This feature is coming soon")}>
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-destructive">Delete account</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}

// ===========================
// Privacy and Security Section
// ===========================
function PrivacySection({ renderBack, setSection }: { renderBack: (t: string, onBack?: () => void) => React.ReactNode; setSection: (s: string | null) => void }) {
  const { user } = useAuth();
  const [loggedOutVisibility, setLoggedOutVisibility] = useState(() => localStorage.getItem("awaj-logged-out-visibility") === "true");

  const toggleLoggedOutVisibility = (v: boolean) => {
    setLoggedOutVisibility(v);
    localStorage.setItem("awaj-logged-out-visibility", String(v));
    toast.success("Setting updated");
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Privacy and Security", () => setSection(null))}
      <ScrollArea className="flex-1">
        {/* 2FA */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Email 2FA {user?.email_confirmed_at ? "enabled" : "disabled"}</span>
            </div>
            <span className="text-sm font-medium text-primary cursor-pointer" onClick={() => toast.info("Two-factor authentication is managed via email verification")}>
              {user?.email_confirmed_at ? "Enabled" : "Change"}
            </span>
          </div>
        </div>

        {/* Chat privacy */}
        <div className="border-b border-border">
          <SettingsRow icon={MessageSquare} label="Chat privacy" onClick={() => {
            const navigate = window.location;
            window.location.href = "/messages/settings";
          }} />
        </div>

        {/* Logged-out visibility */}
        <div className="border-b border-border px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Ban className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-[15px] font-semibold text-foreground">Logged-out visibility</span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={loggedOutVisibility}
              onCheckedChange={(c) => toggleLoggedOutVisibility(!!c)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Discourage apps from showing my account to logged-out users</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Awaj will not show your profile and posts to logged-out users. Other apps may not honor this request. This does not make your account private.
              </p>
            </div>
          </label>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Note: Awaj is an open and public network. This setting only limits the visibility of your content on the Awaj app and website, and other apps may not respect this setting.
              </p>
            </div>
          </div>
        </div>

        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}

// ===========================
// Moderation Section
// ===========================
function ModerationSection({ renderBack, setSection }: { renderBack: (t: string, onBack?: () => void) => React.ReactNode; setSection: (s: string | null) => void }) {
  const navigate = useNavigate();

  // Content filters from localStorage
  const [adultContent, setAdultContent] = useState(() => localStorage.getItem("awaj-adult-content") === "true");
  const [adultFilter, setAdultFilter] = useState(() => localStorage.getItem("awaj-adult-filter") || "hide");
  const [suggestiveFilter, setSuggestiveFilter] = useState(() => localStorage.getItem("awaj-suggestive-filter") || "warn");
  const [graphicFilter, setGraphicFilter] = useState(() => localStorage.getItem("awaj-graphic-filter") || "warn");
  const [nudityFilter, setNudityFilter] = useState(() => localStorage.getItem("awaj-nudity-filter") || "hide");

  const saveFilter = (key: string, value: string, setter: (v: string) => void) => {
    setter(value);
    localStorage.setItem(key, value);
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Moderation", () => setSection(null))}
      <ScrollArea className="flex-1">
        {/* Moderation tools */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Moderation tools</h3>
        </div>
        <div className="border-y border-border bg-muted/30">
          <SettingsRow icon={Filter} label="Interaction settings" onClick={() => toast.info("Manage interaction settings from the post composer")} />
          <SettingsRow icon={VolumeX} label="Muted accounts" onClick={() => setSection("muted")} />
          <SettingsRow icon={UserX} label="Blocked accounts" onClick={() => setSection("blocked")} />
          <SettingsRow icon={BadgeCheck} label="Verification settings" onClick={() => navigate("/verification/apply")} />
        </div>

        {/* Content filters */}
        <div className="px-4 pt-6 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Content filters</h3>
        </div>
        <div className="border-y border-border">
          {/* Enable adult content */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <span className="text-[15px] font-medium text-foreground">Enable adult content</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{adultContent ? "Enabled" : "Disabled"}</span>
              <Switch
                checked={adultContent}
                onCheckedChange={(v) => {
                  setAdultContent(v);
                  localStorage.setItem("awaj-adult-content", String(v));
                }}
              />
            </div>
          </div>

          {/* Filter rows */}
          <ContentFilterRow
            label="Adult Content"
            description="Explicit sexual images."
            value={adultFilter}
            onChange={(v) => saveFilter("awaj-adult-filter", v, setAdultFilter)}
          />
          <ContentFilterRow
            label="Sexually Suggestive"
            description="Does not include nudity."
            value={suggestiveFilter}
            onChange={(v) => saveFilter("awaj-suggestive-filter", v, setSuggestiveFilter)}
          />
          <ContentFilterRow
            label="Graphic Media"
            description="Explicit or potentially disturbing media."
            value={graphicFilter}
            onChange={(v) => saveFilter("awaj-graphic-filter", v, setGraphicFilter)}
          />
          <ContentFilterRow
            label="Non-sexual Nudity"
            description="E.g. artistic nudes."
            value={nudityFilter}
            onChange={(v) => saveFilter("awaj-nudity-filter", v, setNudityFilter)}
          />
        </div>

        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}

// ===========================
// Muted Accounts Section
// ===========================
function MutedSection({ renderBack, setSection }: { renderBack: (t: string, onBack?: () => void) => React.ReactNode; setSection: (s: string | null) => void }) {
  const { user } = useAuth();
  const [mutedAccounts, setMutedAccounts] = useState<MutedAccount[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("muted_accounts").select("id, muted_user_id, profiles:profiles!muted_accounts_muted_user_id_fkey(username, display_name)").eq("user_id", user.id).then(({ data }) => {
      setMutedAccounts((data as any) || []);
    });
  }, [user]);

  const handleUnmute = async (id: string) => {
    await supabase.from("muted_accounts").delete().eq("id", id);
    setMutedAccounts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Account unmuted");
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Muted Accounts", () => setSection("moderation"))}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {mutedAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No muted accounts</p>
          ) : mutedAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
              <div>
                <p className="font-medium">{(a.profiles as any)?.display_name || "User"}</p>
                <p className="text-sm text-muted-foreground">@{(a.profiles as any)?.username || "unknown"}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleUnmute(a.id)}>Unmute</Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Blocked Accounts Section
// ===========================
function BlockedSection({ renderBack, setSection }: { renderBack: (t: string, onBack?: () => void) => React.ReactNode; setSection: (s: string | null) => void }) {
  const { user } = useAuth();
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("blocked_accounts").select("id, blocked_user_id, profiles:profiles!blocked_accounts_blocked_user_id_fkey(username, display_name)").eq("user_id", user.id).then(({ data }) => {
      setBlockedAccounts((data as any) || []);
    });
  }, [user]);

  const handleUnblock = async (id: string) => {
    await supabase.from("blocked_accounts").delete().eq("id", id);
    setBlockedAccounts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Account unblocked");
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Blocked Accounts", () => setSection("moderation"))}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {blockedAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No blocked accounts</p>
          ) : blockedAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
              <div>
                <p className="font-medium">{(a.profiles as any)?.display_name || "User"}</p>
                <p className="text-sm text-muted-foreground">@{(a.profiles as any)?.username || "unknown"}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleUnblock(a.id)}>Unblock</Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Appearance Section (Bluesky style)
// ===========================
function AppearanceSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("awaj-font-size") || "medium");

  const handleFontSize = (size: string) => {
    setFontSize(size);
    localStorage.setItem("awaj-font-size", size);
    document.documentElement.setAttribute("data-font-size", size);
    toast.success(`Font size set to ${size}`);
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Appearance")}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Color mode */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-foreground">Color mode</span>
            </div>
            <SegmentedControl
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              value={theme || "system"}
              onChange={(v) => setTheme(v)}
            />
          </div>

          <div className="border-t border-border" />

          {/* Font size */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Type className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-foreground">Font size</span>
            </div>
            <SegmentedControl
              options={[
                { value: "small", label: "Smaller" },
                { value: "medium", label: "Default" },
                { value: "large", label: "Larger" },
              ]}
              value={fontSize}
              onChange={handleFontSize}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Accessibility Section (Bluesky style)
// ===========================
function AccessibilitySection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("awaj-reduce-motion") === "true");
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("awaj-high-contrast") === "true");
  const [requireAltText, setRequireAltText] = useState(() => localStorage.getItem("awaj-require-alt-text") === "true");
  const [largeAltBadges, setLargeAltBadges] = useState(() => localStorage.getItem("awaj-large-alt-badges") === "true");

  const toggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    if (key === "awaj-reduce-motion") document.documentElement.classList.toggle("reduce-motion", value);
    if (key === "awaj-high-contrast") document.documentElement.classList.toggle("high-contrast", value);
    toast.success("Setting updated");
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Accessibility")}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Alt text */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-3">
              <Accessibility className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-foreground">Alt text</span>
            </div>
            <div className="space-y-3 ml-8">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">Require alt text before posting</span>
                <Checkbox
                  checked={requireAltText}
                  onCheckedChange={(c) => toggle("awaj-require-alt-text", !!c, setRequireAltText)}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">Display larger alt text badges</span>
                <Checkbox
                  checked={largeAltBadges}
                  onCheckedChange={(c) => toggle("awaj-large-alt-badges", !!c, setLargeAltBadges)}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-border my-2" />

          {/* Motion & contrast */}
          <div className="px-4 py-3 space-y-3">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Reduce motion</p>
                <p className="text-xs text-muted-foreground">Minimize animations</p>
              </div>
              <Switch
                checked={reduceMotion}
                onCheckedChange={(v) => toggle("awaj-reduce-motion", v, setReduceMotion)}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <p className="text-sm font-medium text-foreground">High contrast</p>
                <p className="text-xs text-muted-foreground">Increase contrast for readability</p>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={(v) => toggle("awaj-high-contrast", v, setHighContrast)}
              />
            </label>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Languages Section (Bluesky style)
// ===========================
function LanguagesSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem("awaj-language") || "en");
  const [primaryLanguage, setPrimaryLanguage] = useState(() => localStorage.getItem("awaj-primary-language") || "en");
  const [contentLanguages, setContentLanguages] = useState<string[]>(() => {
    const saved = localStorage.getItem("awaj-content-languages");
    return saved ? JSON.parse(saved) : ["en"];
  });

  const languages = [
    { code: "en", label: "English" },
    { code: "bn", label: "Bangla" },
    { code: "hi", label: "Hindi" },
    { code: "es", label: "Spanish" },
    { code: "fr", label: "French" },
    { code: "ar", label: "Arabic" },
    { code: "zh", label: "Chinese" },
    { code: "ja", label: "Japanese" },
  ];

  const handleAppLanguage = (code: string) => {
    setAppLanguage(code);
    localStorage.setItem("awaj-language", code);
    toast.success(`App language set to ${languages.find(l => l.code === code)?.label}`);
  };

  const handlePrimaryLanguage = (code: string) => {
    setPrimaryLanguage(code);
    localStorage.setItem("awaj-primary-language", code);
    toast.success(`Primary language set to ${languages.find(l => l.code === code)?.label}`);
  };

  const toggleContentLanguage = (code: string) => {
    const updated = contentLanguages.includes(code)
      ? contentLanguages.filter(c => c !== code)
      : [...contentLanguages, code];
    setContentLanguages(updated);
    localStorage.setItem("awaj-content-languages", JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Languages")}
      <ScrollArea className="flex-1">
        <div className="space-y-0">
          {/* App language */}
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground mb-1">App language</h3>
            <p className="text-sm text-muted-foreground mb-3">Select which language to use for the app's user interface.</p>
            <select
              value={appLanguage}
              onChange={(e) => handleAppLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground appearance-none cursor-pointer"
            >
              {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          {/* Primary language */}
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground mb-1">Primary language</h3>
            <p className="text-sm text-muted-foreground mb-3">Select your preferred language for translations in your feed.</p>
            <select
              value={primaryLanguage}
              onChange={(e) => handlePrimaryLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground appearance-none cursor-pointer"
            >
              {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          {/* Content languages */}
          <div className="px-4 py-4">
            <h3 className="text-base font-semibold text-foreground mb-1">Content languages</h3>
            <p className="text-sm text-muted-foreground mb-3">Select which languages you want your subscribed feeds to include. If none are selected, all languages will be shown.</p>
            <div className="rounded-lg border border-border overflow-hidden">
              {languages.map((l) => (
                <label key={l.code} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-b-0">
                  <Checkbox
                    checked={contentLanguages.includes(l.code)}
                    onCheckedChange={() => toggleContentLanguage(l.code)}
                  />
                  <span className="text-sm font-medium text-foreground">{l.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// About Section (Bluesky style)
// ===========================
function AboutSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      {renderBack("About")}
      <ScrollArea className="flex-1">
        <div className="py-1">
          <div className="border-b border-border">
            <SettingsRow icon={Book} label="Terms of Service" onClick={() => toast.info("Terms of Service coming soon")} />
            <SettingsRow icon={Book} label="Privacy Policy" onClick={() => toast.info("Privacy Policy coming soon")} />
            <SettingsRow icon={Globe} label="Status Page" onClick={() => toast.info("Status page coming soon")} />
          </div>

          <div className="border-b border-border">
            <SettingsRow icon={Wrench} label="System log" onClick={() => toast.info("System log coming soon")} />
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-foreground">Version 1.0.0</span>
              </div>
              <span className="text-sm text-muted-foreground">stable</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Reusable Components
// ===========================
function SettingsRow({ icon: Icon, label, onClick, subtext }: { icon: any; label: string; onClick: () => void; subtext?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        <div>
          <span className="text-[15px] font-medium text-foreground">{label}</span>
          {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg bg-muted/50 border border-border p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ContentFilterRow({ label, description, value, onChange }: {
  label: string; description: string; value: string; onChange: (v: string) => void;
}) {
  const options = ["Show", "Warn", "Hide"];
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-b-0">
      <p className="text-[15px] font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt.toLowerCase())}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              value === opt.toLowerCase()
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:bg-accent"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
