import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Compass, Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const mobileNavItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Search", path: "/search", icon: Search },
  { label: "Feeds", path: "/feeds", icon: Compass },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background py-2 lg:hidden">
      {mobileNavItems.map(({ label, path, icon: Icon }) => {
        const profilePath = path === "/profile" ? `/profile/${profile?.username || ""}` : path;
        const isActive = path === "/"
          ? pathname === "/"
          : pathname.startsWith(path === "/profile" ? "/profile" : path);

        return (
          <NavLink
            key={label}
            to={profilePath}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={isActive ? 2.25 : 1.75} />
            <span className="text-[10px]">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
