import { NavLink, useNavigate } from "react-router-dom";
import { Home, Search, MessageCircle, Bell, Hash, List, Bookmark, User, Settings, Moon, Sun, ShieldCheck, LogOut } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { useTranslation } from "@/i18n/LanguageContext";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const { profile, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { isStaff, isAdmin } = useRole();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const drawerNavItems = [
    { label: t("nav.explore"), path: "/search", icon: Search },
    { label: t("nav.home"), path: "/", icon: Home },
    { label: t("nav.chat"), path: "/messages", icon: MessageCircle },
    { label: t("nav.notifications"), path: "/notifications", icon: Bell },
    { label: t("nav.feeds"), path: "/feeds", icon: Hash },
    { label: t("nav.lists"), path: "/lists", icon: List },
    { label: t("nav.saved"), path: "/saved", icon: Bookmark },
    { label: t("nav.profile"), path: "/profile", icon: User },
    { label: t("nav.settings"), path: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    onOpenChange(false);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower_count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following_count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate flex items-center gap-1">
              {profile?.display_name || "User"}
              {user && <VerifiedBadge userId={user.id} />}
            </p>
            <p className="text-xs text-muted-foreground truncate">@{profile?.username || "handle"}</p>
            <p className="text-xs mt-0.5">
              <span className="font-bold text-foreground">{followerCount}</span> <span className="text-muted-foreground">{t("profile.followers")}</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="font-bold text-foreground">{followingCount}</span> <span className="text-muted-foreground">{t("profile.following_label")}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-border" />

        <nav className="flex-1 overflow-y-auto py-1 px-2">
          {drawerNavItems.map(({ label, path, icon: Icon }) => {
            const profilePath = path === "/profile" ? `/profile/${profile?.username || ""}` : path;
            return (
              <NavLink key={label} to={profilePath} onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors ${isActive ? "text-foreground bg-accent" : "text-foreground hover:bg-accent"}`
                }>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {label}
              </NavLink>
            );
          })}
          {isStaff && (
            <NavLink to="/admin" onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors ${isActive ? "text-primary bg-primary/10" : "text-primary hover:bg-primary/5"}`
              }>
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
              {isAdmin ? t("drawer.admin_panel") : t("drawer.mod_panel")}
            </NavLink>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors text-destructive hover:bg-destructive/10 w-full">
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            {t("drawer.log_out")}
          </button>
        </nav>

        <div className="border-t border-border" />
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="text-sm font-medium">{t("drawer.dark_mode")}</span>
          </div>
          <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
        </div>

        <div className="border-t border-border" />
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex gap-3 text-xs">
            <a href="#" className="text-primary hover:underline">{t("drawer.terms")}</a>
            <a href="#" className="text-primary hover:underline">{t("drawer.privacy")}</a>
          </div>
          <div className="flex gap-1.5">
            <NavLink to="/support" onClick={() => onOpenChange(false)} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent">
              <MessageCircle className="h-3 w-3" /> {t("drawer.feedback")}
            </NavLink>
            <NavLink to="/support" onClick={() => onOpenChange(false)} className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent">
              {t("settings.help")}
            </NavLink>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
