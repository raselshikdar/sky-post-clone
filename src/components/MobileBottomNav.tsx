import { NavLink, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// --- Bluesky Custom SVG Nav Icons ---
const BskyHome = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const BskySearch = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const BskyChat = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const BskyBell = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);
// --------------------------------

const mobileNavItems = [
  { label: "Home", path: "/", icon: BskyHome },
  { label: "Search", path: "/search", icon: BskySearch },
  { label: "Chat", path: "/messages", icon: BskyChat },
  { label: "Notifications", path: "/notifications", icon: BskyBell },
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

  // Realtime: notifications
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

  // Realtime: messages
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

        return (
          <NavLink
            key={label}
            to={path}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <Icon
                className="h-6 w-6"
                strokeWidth={isActive ? 2.25 : 1.75}
                fill={isActive && path === "/" ? "currentColor" : "none"}
              />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
          </NavLink>
        );
      })}

      {/* Profile avatar as last nav item */}
      <NavLink
        to={`/profile/${profile?.username || ""}`}
        className="flex flex-col items-center gap-0.5 px-3 py-1"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </NavLink>
    </nav>
  );
}
