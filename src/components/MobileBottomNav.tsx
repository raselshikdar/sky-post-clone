import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, MessageCircle, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const mobileNavItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Search", path: "/search", icon: Search },
  { label: "Chat", path: "/chat", icon: MessageCircle },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background py-2 lg:hidden">
      {mobileNavItems.map(({ label, path, icon: Icon }) => {
        const isActive = path === "/"
          ? pathname === "/"
          : pathname.startsWith(path);

        return (
          <NavLink
            key={label}
            to={path}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon
              className="h-6 w-6"
              strokeWidth={isActive ? 2.25 : 1.75}
              fill={isActive && path === "/" ? "currentColor" : "none"}
            />
          </NavLink>
        );
      })}

      {/* Profile avatar as last nav item */}
      <NavLink
        to={`/profile/${profile?.username || ""}`}
        className="flex flex-col items-center gap-0.5 px-3 py-1"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </NavLink>
    </nav>
  );
}
