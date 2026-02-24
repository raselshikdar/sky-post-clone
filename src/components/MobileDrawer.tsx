import { NavLink } from "react-router-dom";
import { Home, Search, MessageCircle, Bell, Hash, List, Bookmark, User, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const drawerNavItems = [
  { label: "Explore", path: "/search", icon: Search },
  { label: "Home", path: "/", icon: Home },
  { label: "Chat", path: "/chat", icon: MessageCircle },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Feeds", path: "/feeds", icon: Hash },
  { label: "Lists", path: "/lists", icon: List },
  { label: "Saved", path: "/saved", icon: Bookmark },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: Settings },
];

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const { profile } = useAuth();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
        {/* Profile header */}
        <div className="px-5 pt-6 pb-4">
          <Avatar className="h-14 w-14 mb-3">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {profile?.display_name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-base font-bold text-foreground">{profile?.display_name || "User"}</p>
          <p className="text-sm text-muted-foreground">@{profile?.username || "handle"}</p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span><span className="font-bold text-foreground">0</span> <span className="text-muted-foreground">followers</span></span>
            <span>·</span>
            <span><span className="font-bold text-foreground">0</span> <span className="text-muted-foreground">following</span></span>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {drawerNavItems.map(({ label, path, icon: Icon }) => {
            const profilePath = path === "/profile" ? `/profile/${profile?.username || ""}` : path;
            return (
              <NavLink
                key={label}
                to={profilePath}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-lg px-4 py-3 text-[16px] font-semibold transition-colors ${
                    isActive ? "text-foreground bg-accent" : "text-foreground hover:bg-accent"
                  }`
                }
              >
                <Icon className="h-6 w-6" strokeWidth={1.75} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border" />

        {/* Footer */}
        <div className="px-5 py-4">
          <a href="#" className="block text-sm text-primary hover:underline mb-1">Terms of Service</a>
          <a href="#" className="block text-sm text-primary hover:underline mb-3">Privacy Policy</a>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent">
              <MessageCircle className="h-4 w-4" /> Feedback
            </button>
            <button className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent">
              Help
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
