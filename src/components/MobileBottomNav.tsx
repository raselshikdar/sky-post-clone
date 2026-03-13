import { NavLink, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// --- Bluesky 100% Accurate Bottom Nav Icons ---

const BskyHome = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3l9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10L12 3z"></path>
  </svg>
);

const BskySearch = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <path d="M21 21l-4.35-4.35"></path>
  </svg>
);

const BskyChat = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8c-1.3 0-2.6-.3-3.7-.8l-3.8 1.1a1 1 0 0 1-1.2-1.2l1.1-3.8A8.4 8.4 0 0 1 4 12Z"></path>
    <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none"></circle>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"></circle>
    <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none"></circle>
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
