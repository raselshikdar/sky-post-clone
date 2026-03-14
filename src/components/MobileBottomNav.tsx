import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, MessageCircleMore, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const mobileNavItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Search", path: "/search", icon: Search },
  { label: "Chat", path: "/messages", icon: MessageCircleMore },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread_notifications_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["unread_messages_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("messages")
        .select("*, conversations!inner(id)", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .eq("read", false)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`, { referencedTable: "conversations" });
      return count || 0;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("nav-notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread_notifications_count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("nav-msg-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread_messages_count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  const getBadge = (label: string) => {
    if (label === "Notifications") return unreadCount;
    if (label === "Chat") return unreadMessages;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background py-2 lg:hidden">
      {mobileNavItems.map(({ label, path, icon: Icon }) => {
        const isActive = path === "/"
          ? pathname === "/"
          : pathname.startsWith(path);
        const badge = getBadge(label);

        let iconFill = "none";
        let customClass = "";

        if (isActive) {
          if (label === "Home") {
            iconFill = "currentColor";
            customClass = " [&>path]:!fill-current [&>polyline]:!fill-background [&>polyline]:!stroke-background";
          } else if (label === "Chat") {
            iconFill = "currentColor";
            customClass = " [&>path:not(:first-child)]:!stroke-background [&>path:not(:first-child)]:!fill-background";
          } else if (label === "Notifications") {
            iconFill = "currentColor";
            customClass = " [&>path:last-child]:!fill-none";
          }
        }

        return (
          <NavLink
            key={label}
            to={path}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-foreground"
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={`h-6 w-6${customClass}`}
                strokeWidth={2.25}
                fill={iconFill}
              />
              {isActive && label === "Search" && (
                <div className="absolute left-[11px] top-[11px] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              )}
              {badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
          </NavLink>
        );
      })}

      <NavLink
        to={`/profile/${profile?.username || ""}`}
        className="flex flex-col items-center gap-0.5 px-3 py-1"
      >
        {/* প্রোফাইল আইকনের সাইজ অন্যান্য আইকনের সাথে ভিজ্যুয়ালি ব্যালেন্স করার জন্য h-[24px] w-[24px] করা হয়েছে */}
        <Avatar className="h-[24px] w-[24px]">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </NavLink>
    </nav>
  );
}
