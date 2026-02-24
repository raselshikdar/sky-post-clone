import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Compass, Bell, User, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DoyelLogo from "@/components/DoyelLogo";

const navItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Search", path: "/search", icon: Search },
  { label: "Feeds", path: "/feeds", icon: Compass },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function DesktopSidebar() {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-screen w-[72px] flex-col items-center border-r border-border py-4 lg:flex xl:w-[240px] xl:items-start xl:px-4">
      {/* Logo */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center xl:ml-2">
        <DoyelLogo className="h-8 w-8" />
      </div>

      {/* Nav */}
      <nav className="flex w-full flex-1 flex-col gap-1 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => {
          const profilePath = path === "/profile" ? `/profile/${profile?.username || ""}` : path;
          const isActive = path === "/"
            ? pathname === "/"
            : pathname.startsWith(path === "/profile" ? "/profile" : path);

          return (
            <NavLink
              key={label}
              to={profilePath}
              className={`flex items-center gap-3 rounded-full px-3 py-3 text-[15px] transition-colors bsky-hover ${
                isActive ? "font-bold text-foreground" : "text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="hidden xl:inline">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      {profile && (
        <div className="mt-auto flex items-center gap-3 rounded-full p-2 xl:w-full xl:px-3 xl:py-2 bsky-hover">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {profile.display_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-sm font-semibold">{profile.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
