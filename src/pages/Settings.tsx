import { useState, useEffect } from "react";
import {
  ChevronRight, User, Bell, Palette, Eye, VolumeX, UserX, LogOut,
  ChevronLeft, BadgeCheck, HelpCircle, Globe, Accessibility, FileText, Info,
  ShieldCheck, Lock, Sun, Moon, Monitor, Type, Languages, Mail, PenLine,
  AtSign, Cake, Download, XCircle, Trash2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // === Account ===
  if (section === "account") {
    return <AccountSection renderBack={renderBack} />;
  }

  // === Muted ===
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

  // === Blocked ===
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

  // === Moderation / Privacy ===
  if (section === "moderation") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Privacy & Security")}
        <ScrollArea className="flex-1">
          <div className="py-2">
            <SettingsRow icon={VolumeX} label="Muted Accounts" onClick={() => setSection("muted")} />
            <SettingsRow icon={UserX} label="Blocked Accounts" onClick={() => setSection("blocked")} />
            <SettingsRow icon={Bell} label="Chat Privacy" onClick={() => navigate("/messages/settings")} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // === Appearance ===
  if (section === "appearance") {
    return <AppearanceSection onBack={() => setSection(null)} renderBack={renderBack} />;
  }

  // === Accessibility ===
  if (section === "accessibility") {
    return <AccessibilitySection onBack={() => setSection(null)} renderBack={renderBack} />;
  }

  // === Languages ===
  if (section === "languages") {
    return <LanguagesSection onBack={() => setSection(null)} renderBack={renderBack} />;
  }

  // === About ===
  if (section === "about") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("About")}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="flex flex-col items-center py-4">
              <img src="/awaj-logo.png" alt="Awaj" className="h-16 w-16 rounded-2xl" />
              <h3 className="mt-3 text-xl font-bold text-foreground">Awaj</h3>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-muted p-4">
                <p className="font-medium text-foreground">About Awaj</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Awaj (আওয়াজ) is a social platform where every voice matters. Share your thoughts, discover new ideas, and connect with people who matter.
                </p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="font-medium text-foreground">Contact</p>
                <p className="mt-1 text-sm text-muted-foreground">support@awaj.app</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="font-medium text-foreground">Legal</p>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-primary cursor-pointer hover:underline">Terms of Service</p>
                  <p className="text-sm text-primary cursor-pointer hover:underline">Privacy Policy</p>
                  <p className="text-sm text-primary cursor-pointer hover:underline">Community Guidelines</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // === Main settings ===
  const mainItems = [
    { label: "Account", icon: User, action: () => setSection("account") },
    { label: "Privacy and security", icon: Lock, action: () => setSection("moderation") },
    { label: "Notifications", icon: Bell, action: () => navigate("/notifications/settings") },
    { label: "Content and media", icon: FileText, action: () => navigate("/feeds/settings") },
    { label: "Appearance", icon: Palette, action: () => setSection("appearance") },
    { label: "Accessibility", icon: Accessibility, action: () => setSection("accessibility") },
    { label: "Languages", icon: Globe, action: () => setSection("languages") },
    { label: "Apply for Verification", icon: BadgeCheck, action: () => navigate("/verification/apply") },
    { label: "Help & Support", icon: HelpCircle, action: () => navigate("/support") },
    { label: "About", icon: Info, action: () => setSection("about") },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">Settings</h2>
      </div>

      <ScrollArea className="flex-1">
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

        <div className="py-2">
          {mainItems.map(({ label, icon: Icon, action }) => (
            <SettingsRow key={label} icon={Icon} label={label} onClick={action} />
          ))}
        </div>

        <div className="border-t border-border" />

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

// === Account Section ===
function AccountSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
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

  // Update email
  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmation email sent to your new address");
    setSubSection(null);
  };

  // Update handle
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

  // Update birthday
  const handleSaveBirthday = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ birthday: birthday || null } as any).eq("id", user!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Birthday updated");
    setEditingBirthday(false);
  };

  // Sub-sections
  if (subSection === "update-email") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Update Email")}
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
        {renderBack("Handle")}
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

  // Main account view
  return (
    <div className="flex flex-col h-full">
      {renderBack("Account")}
      <ScrollArea className="flex-1">
        {/* Email group */}
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

        {/* Password & Handle group */}
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
                {birthday ? new Date(birthday + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Edit"}
              </button>
            )}
          </div>
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

// === Appearance Section ===
function AppearanceSection({ onBack, renderBack }: { onBack: () => void; renderBack: (t: string) => React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem("awaj-font-size") || "medium";
  });

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const fontSizes = [
    { value: "small", label: "Small", size: "text-sm" },
    { value: "medium", label: "Medium", size: "text-base" },
    { value: "large", label: "Large", size: "text-lg" },
  ];

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
          {/* Theme */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 border-2 transition-colors ${
                    theme === value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Font Size</h3>
            <div className="space-y-2">
              {fontSizes.map(({ value, label, size }) => (
                <button
                  key={value}
                  onClick={() => handleFontSize(value)}
                  className={`flex w-full items-center justify-between rounded-xl p-3 border-2 transition-colors ${
                    fontSize === value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span className={`${size} font-medium ${fontSize === value ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </span>
                  <span className={`${size} text-muted-foreground`}>Aa</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// === Accessibility Section ===
function AccessibilitySection({ onBack, renderBack }: { onBack: () => void; renderBack: (t: string) => React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("awaj-reduce-motion") === "true");
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("awaj-high-contrast") === "true");

  const toggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    if (key === "awaj-reduce-motion") {
      document.documentElement.classList.toggle("reduce-motion", value);
    }
    if (key === "awaj-high-contrast") {
      document.documentElement.classList.toggle("high-contrast", value);
    }
    toast.success("Setting updated");
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Accessibility")}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <ToggleSettingRow
            label="Reduce motion"
            description="Minimize animations throughout the app"
            checked={reduceMotion}
            onChange={(v) => toggle("awaj-reduce-motion", v, setReduceMotion)}
          />
          <ToggleSettingRow
            label="High contrast"
            description="Increase contrast for better readability"
            checked={highContrast}
            onChange={(v) => toggle("awaj-high-contrast", v, setHighContrast)}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// === Languages Section ===
function LanguagesSection({ onBack, renderBack }: { onBack: () => void; renderBack: (t: string) => React.ReactNode }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("awaj-language") || "en");

  const languages = [
    { code: "en", label: "English", native: "English" },
    { code: "bn", label: "Bengali", native: "বাংলা" },
    { code: "hi", label: "Hindi", native: "हिन्दी" },
    { code: "es", label: "Spanish", native: "Español" },
    { code: "fr", label: "French", native: "Français" },
    { code: "ar", label: "Arabic", native: "العربية" },
    { code: "zh", label: "Chinese", native: "中文" },
    { code: "ja", label: "Japanese", native: "日本語" },
  ];

  const handleLanguage = (code: string) => {
    setLanguage(code);
    localStorage.setItem("awaj-language", code);
    toast.success(`Language set to ${languages.find((l) => l.code === code)?.label}`);
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack("Languages")}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {languages.map(({ code, label, native }) => (
            <button
              key={code}
              onClick={() => handleLanguage(code)}
              className={`flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-accent ${
                language === code ? "bg-primary/5" : ""
              }`}
            >
              <div>
                <p className="font-medium text-foreground text-[15px]">{label}</p>
                <p className="text-sm text-muted-foreground">{native}</p>
              </div>
              {language === code && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// === Reusable Components ===
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

function ToggleSettingRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-4">
      <div className="flex-1 mr-3">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
