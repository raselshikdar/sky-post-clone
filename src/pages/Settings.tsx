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
import { useTranslation } from "@/i18n/LanguageContext";

interface MutedAccount { id: string; muted_user_id: string; profiles?: { username: string; display_name: string } }
interface BlockedAccount { id: string; blocked_user_id: string; profiles?: { username: string; display_name: string } }

export default function SettingsPage() {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const renderBack = (title: string, onBack?: () => void) => (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
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

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-bold">{t("settings.settings")}</h2>
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
            {user && <VerifiedBadge userId={user.id} />}
          </h3>
          <p className="text-sm text-primary">@{profile?.username || "handle"}</p>
        </div>

        <div className="py-1 border-b border-border">
          <SettingsRow icon={User} label={t("settings.account")} onClick={() => setSection("account")} />
          <SettingsRow icon={Lock} label={t("settings.privacy")} onClick={() => setSection("privacy")} />
          <SettingsRow icon={Shield} label={t("settings.moderation")} onClick={() => setSection("moderation")} />
          <SettingsRow icon={Bell} label={t("nav.notifications")} onClick={() => navigate("/notifications/settings")} />
          <SettingsRow icon={FileText} label={t("settings.content_media")} onClick={() => navigate("/feeds/settings")} />
          <SettingsRow icon={Palette} label={t("settings.appearance")} onClick={() => setSection("appearance")} />
          <SettingsRow icon={Accessibility} label={t("settings.accessibility")} onClick={() => setSection("accessibility")} />
          <SettingsRow icon={Globe} label={t("settings.languages")} onClick={() => setSection("languages")} />
          <SettingsRow icon={HelpCircle} label={t("settings.help")} onClick={() => navigate("/support")} />
          <SettingsRow icon={Info} label={t("settings.about")} onClick={() => setSection("about")} />
        </div>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive hover:bg-accent transition-colors"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[15px] font-medium">{t("settings.sign_out")}</span>
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
  const { t } = useTranslation();

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
    toast.success(t("account.confirmation_sent"));
    setSubSection(null);
  };

  const handleUpdateHandle = async () => {
    const handle = newHandle.trim().toLowerCase();
    if (!handle || handle.length < 3) { toast.error(t("account.handle_rules")); return; }
    if (!/^[a-z0-9_]+$/.test(handle)) { toast.error(t("account.handle_rules")); return; }
    if (handle === profile?.username) { setSubSection(null); return; }

    // Check 6-month cooldown
    setSaving(true);
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("username_changed_at")
      .eq("id", user!.id)
      .single();

    if (currentProfile?.username_changed_at) {
      const lastChanged = new Date(currentProfile.username_changed_at);
      const sixMonthsLater = new Date(lastChanged);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      if (new Date() < sixMonthsLater) {
        setSaving(false);
        const nextDate = sixMonthsLater.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        toast.error(t("account.handle_cooldown").replace("{date}", nextDate));
        return;
      }
    }

    const { data: existing } = await supabase.from("profiles").select("id").eq("username", handle).neq("id", user!.id).maybeSingle();
    if (existing) { setSaving(false); toast.error(t("account.username_taken")); return; }
    const { error } = await supabase.from("profiles").update({ username: handle, username_changed_at: new Date().toISOString() } as any).eq("id", user!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("account.handle_updated"));
    setSubSection(null);
  };

  const handleSaveBirthday = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ birthday: birthday || null } as any).eq("id", user!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("account.birthday_updated"));
    setEditingBirthday(false);
  };

  if (subSection === "update-email") {
    return (
      <div className="flex flex-col h-full">
        {renderBack(t("account.update_email"), () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t("account.current")} {user?.email}</p>
          <div className="space-y-2">
            <Label>{t("account.new_email")}</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t("account.enter_new_email")} />
          </div>
          <Button className="w-full rounded-full" disabled={saving || !newEmail.trim()} onClick={handleUpdateEmail}>
            {saving ? t("account.sending") : t("account.update_email_btn")}
          </Button>
        </div>
      </div>
    );
  }

  if (subSection === "handle") {
    return (
      <div className="flex flex-col h-full">
        {renderBack(t("account.handle"), () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          <div className="space-y-2">
            <Label>{t("account.new_handle")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input className="pl-8" value={newHandle} onChange={(e) => setNewHandle(e.target.value.toLowerCase())} placeholder="username" />
            </div>
           <p className="text-xs text-muted-foreground">{t("account.handle_rules")}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t("account.handle_cooldown_info")}</p>
          </div>
          <Button className="w-full rounded-full" disabled={saving || !newHandle.trim()} onClick={handleUpdateHandle}>
            {saving ? t("account.saving") : t("account.save_handle")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {renderBack(t("settings.account"), () => setSection(null))}
      <ScrollArea className="flex-1">
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">{t("account.email")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
              {user?.email_confirmed_at && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
          </div>
          <SettingsRow icon={PenLine} label={t("account.update_email")} onClick={() => { setNewEmail(""); setSubSection("update-email"); }} />
        </div>

        <div className="border-b border-border">
          <SettingsRow icon={Lock} label={t("account.password")} onClick={() => navigate("/reset-password")} />
          <SettingsRow icon={AtSign} label={t("account.handle")} onClick={() => setSubSection("handle")} />
          <div className="flex items-center justify-between px-4 py-3.5 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <Cake className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">{t("account.birthday")}</span>
            </div>
            {editingBirthday ? (
              <div className="flex items-center gap-2">
                <Input type="date" className="h-8 w-auto text-sm" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                <Button size="sm" variant="ghost" className="h-8 text-primary" disabled={saving} onClick={handleSaveBirthday}>
                  {saving ? "..." : t("account.save")}
                </Button>
              </div>
            ) : (
              <button onClick={() => setEditingBirthday(true)} className="text-sm font-medium text-primary">
                {birthday ? new Date(birthday + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : t("account.set")}
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-border">
          <SettingsRow icon={BadgeCheck} label={t("account.verification")} onClick={() => navigate("/verification/apply")} />
        </div>

        <div className="border-b border-border">
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors" onClick={() => toast.info(t("account.coming_soon"))}>
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">{t("account.export_data")}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors" onClick={() => toast.info(t("account.coming_soon"))}>
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-destructive">{t("account.deactivate")}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors" onClick={() => toast.info(t("account.coming_soon"))}>
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-destructive">{t("account.delete_account")}</span>
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
  const { t } = useTranslation();
  const [loggedOutVisibility, setLoggedOutVisibility] = useState(() => localStorage.getItem("awaj-logged-out-visibility") === "true");

  const toggleLoggedOutVisibility = (v: boolean) => {
    setLoggedOutVisibility(v);
    localStorage.setItem("awaj-logged-out-visibility", String(v));
    toast.success(t("privacy.setting_updated"));
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack(t("settings.privacy"), () => setSection(null))}
      <ScrollArea className="flex-1">
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">{t("privacy.email_2fa")} {user?.email_confirmed_at ? t("privacy.enabled").toLowerCase() : t("privacy.disabled").toLowerCase()}</span>
            </div>
            <span className="text-sm font-medium text-primary cursor-pointer" onClick={() => toast.info(t("account.coming_soon"))}>
              {user?.email_confirmed_at ? t("privacy.enabled") : t("privacy.change")}
            </span>
          </div>
        </div>

        <div className="border-b border-border">
          <SettingsRow icon={MessageSquare} label={t("privacy.chat_privacy")} onClick={() => { window.location.href = "/messages/settings"; }} />
        </div>

        <div className="border-b border-border px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Ban className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-[15px] font-semibold text-foreground">{t("privacy.logged_out")}</span>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={loggedOutVisibility} onCheckedChange={(c) => toggleLoggedOutVisibility(!!c)} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("privacy.discourage")}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("privacy.note")}</p>
            </div>
          </label>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{t("privacy.note_public")}</p>
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
  const { t } = useTranslation();

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
      {renderBack(t("settings.moderation"), () => setSection(null))}
      <ScrollArea className="flex-1">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("mod.tools")}</h3>
        </div>
        <div className="border-y border-border bg-muted/30">
          <SettingsRow icon={Filter} label={t("mod.interaction")} onClick={() => toast.info(t("mod.interaction_note"))} />
          <SettingsRow icon={VolumeX} label={t("mod.muted")} onClick={() => setSection("muted")} />
          <SettingsRow icon={UserX} label={t("mod.blocked")} onClick={() => setSection("blocked")} />
          <SettingsRow icon={BadgeCheck} label={t("mod.verification")} onClick={() => navigate("/verification/apply")} />
        </div>

        <div className="px-4 pt-6 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("mod.content_filters")}</h3>
        </div>
        <div className="border-y border-border">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <span className="text-[15px] font-medium text-foreground">{t("mod.enable_adult")}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{adultContent ? t("privacy.enabled") : t("privacy.disabled")}</span>
              <Switch checked={adultContent} onCheckedChange={(v) => { setAdultContent(v); localStorage.setItem("awaj-adult-content", String(v)); }} />
            </div>
          </div>
          <ContentFilterRow label={t("mod.adult_content")} description={t("mod.adult_desc")} value={adultFilter} onChange={(v) => saveFilter("awaj-adult-filter", v, setAdultFilter)} />
          <ContentFilterRow label={t("mod.suggestive")} description={t("mod.suggestive_desc")} value={suggestiveFilter} onChange={(v) => saveFilter("awaj-suggestive-filter", v, setSuggestiveFilter)} />
          <ContentFilterRow label={t("mod.graphic")} description={t("mod.graphic_desc")} value={graphicFilter} onChange={(v) => saveFilter("awaj-graphic-filter", v, setGraphicFilter)} />
          <ContentFilterRow label={t("mod.nudity")} description={t("mod.nudity_desc")} value={nudityFilter} onChange={(v) => saveFilter("awaj-nudity-filter", v, setNudityFilter)} />
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
  const { t } = useTranslation();
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
    toast.success(t("mod.unmuted"));
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack(t("mod.muted"), () => setSection("moderation"))}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {mutedAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("mod.no_muted")}</p>
          ) : mutedAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
              <div>
                <p className="font-medium">{(a.profiles as any)?.display_name || "User"}</p>
                <p className="text-sm text-muted-foreground">@{(a.profiles as any)?.username || "unknown"}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleUnmute(a.id)}>{t("mod.unmute")}</Button>
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
  const { t } = useTranslation();
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
    toast.success(t("mod.unblocked"));
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack(t("mod.blocked"), () => setSection("moderation"))}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {blockedAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("mod.no_blocked")}</p>
          ) : blockedAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-accent">
              <div>
                <p className="font-medium">{(a.profiles as any)?.display_name || "User"}</p>
                <p className="text-sm text-muted-foreground">@{(a.profiles as any)?.username || "unknown"}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleUnblock(a.id)}>{t("mod.unblock")}</Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Appearance Section
// ===========================
function AppearanceSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("awaj-font-size") || "medium");

  const handleFontSize = (size: string) => {
    setFontSize(size);
    localStorage.setItem("awaj-font-size", size);
    document.documentElement.setAttribute("data-font-size", size);
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack(t("settings.appearance"))}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-foreground">{t("appearance.color_mode")}</span>
            </div>
            <SegmentedControl
              options={[
                { value: "system", label: t("appearance.system") },
                { value: "light", label: t("appearance.light") },
                { value: "dark", label: t("appearance.dark") },
              ]}
              value={theme || "system"}
              onChange={(v) => setTheme(v)}
            />
          </div>
          <div className="border-t border-border" />
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Type className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-foreground">{t("appearance.font_size")}</span>
            </div>
            <SegmentedControl
              options={[
                { value: "small", label: t("appearance.smaller") },
                { value: "medium", label: t("appearance.default") },
                { value: "large", label: t("appearance.larger") },
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
// Accessibility Section
// ===========================
function AccessibilitySection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("awaj-reduce-motion") === "true");
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("awaj-high-contrast") === "true");
  const [requireAltText, setRequireAltText] = useState(() => localStorage.getItem("awaj-require-alt-text") === "true");
  const [largeAltBadges, setLargeAltBadges] = useState(() => localStorage.getItem("awaj-large-alt-badges") === "true");

  const toggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
    if (key === "awaj-reduce-motion") document.documentElement.classList.toggle("reduce-motion", value);
    if (key === "awaj-high-contrast") document.documentElement.classList.toggle("high-contrast", value);
    toast.success(t("privacy.setting_updated"));
  };

  return (
    <div className="flex flex-col h-full">
      {renderBack(t("settings.accessibility"))}
      <ScrollArea className="flex-1">
        <div className="py-2">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-3">
              <Accessibility className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-semibold text-foreground">{t("a11y.alt_text")}</span>
            </div>
            <div className="space-y-3 ml-8">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">{t("a11y.require_alt")}</span>
                <Checkbox checked={requireAltText} onCheckedChange={(c) => toggle("awaj-require-alt-text", !!c, setRequireAltText)} />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground">{t("a11y.larger_badges")}</span>
                <Checkbox checked={largeAltBadges} onCheckedChange={(c) => toggle("awaj-large-alt-badges", !!c, setLargeAltBadges)} />
              </label>
            </div>
          </div>
          <div className="border-t border-border my-2" />
          <div className="px-4 py-3 space-y-3">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{t("a11y.reduce_motion")}</p>
                <p className="text-xs text-muted-foreground">{t("a11y.reduce_motion_desc")}</p>
              </div>
              <Switch checked={reduceMotion} onCheckedChange={(v) => toggle("awaj-reduce-motion", v, setReduceMotion)} />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{t("a11y.high_contrast")}</p>
                <p className="text-xs text-muted-foreground">{t("a11y.high_contrast_desc")}</p>
              </div>
              <Switch checked={highContrast} onCheckedChange={(v) => toggle("awaj-high-contrast", v, setHighContrast)} />
            </label>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================
// Languages Section
// ===========================
function LanguagesSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const { t } = useTranslation();
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
    toast.success(`${t("lang.set_to")} ${languages.find(l => l.code === code)?.label}`);
  };

  const handlePrimaryLanguage = (code: string) => {
    setPrimaryLanguage(code);
    localStorage.setItem("awaj-primary-language", code);
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
      {renderBack(t("settings.languages"))}
      <ScrollArea className="flex-1">
        <div className="space-y-0">
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground mb-1">{t("lang.app_language")}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t("lang.app_language_desc")}</p>
            <select value={appLanguage} onChange={(e) => handleAppLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground appearance-none cursor-pointer">
              {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground mb-1">{t("lang.primary")}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t("lang.primary_desc")}</p>
            <select value={primaryLanguage} onChange={(e) => handlePrimaryLanguage(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground appearance-none cursor-pointer">
              {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div className="px-4 py-4">
            <h3 className="text-base font-semibold text-foreground mb-1">{t("lang.content")}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t("lang.content_desc")}</p>
            <div className="rounded-lg border border-border overflow-hidden">
              {languages.map((l) => (
                <label key={l.code} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-b-0">
                  <Checkbox checked={contentLanguages.includes(l.code)} onCheckedChange={() => toggleContentLanguage(l.code)} />
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
// About Section
// ===========================
function AboutSection({ renderBack }: { renderBack: (t: string) => React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full">
      {renderBack(t("settings.about"))}
      <ScrollArea className="flex-1">
        <div className="py-1">
          <div className="border-b border-border">
            <SettingsRow icon={Book} label={t("about.tos")} onClick={() => toast.info(t("account.coming_soon"))} />
            <SettingsRow icon={Book} label={t("about.privacy")} onClick={() => toast.info(t("account.coming_soon"))} />
            <SettingsRow icon={Globe} label={t("about.status")} onClick={() => toast.info(t("account.coming_soon"))} />
          </div>
          <div className="border-b border-border">
            <SettingsRow icon={Wrench} label={t("about.system_log")} onClick={() => toast.info(t("account.coming_soon"))} />
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-[15px] font-medium text-foreground">{t("about.version")}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t("about.stable")}</span>
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
    <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-accent transition-colors">
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

function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="flex rounded-lg bg-muted/50 border border-border p-1">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${value === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ContentFilterRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (v: string) => void; }) {
  const { t } = useTranslation();
  const options = [
    { key: "show", label: t("mod.show") },
    { key: "warn", label: t("mod.warn") },
    { key: "hide", label: t("mod.hide") },
  ];
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-b-0">
      <p className="text-[15px] font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {options.map((opt) => (
          <button key={opt.key} onClick={() => onChange(opt.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${value === opt.key ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-accent"}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
