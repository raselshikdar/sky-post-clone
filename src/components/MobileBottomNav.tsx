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

        // --- ব্লু-স্কাই এর অরিজিনাল বিহেভিয়ার লজিক ---
        let iconFill = "none";
        let customStyles = "";

        if (isActive) {
          if (label === "Home") {
            iconFill = "currentColor";
          } else if (label === "Chat") {
            iconFill = "currentColor";
            // চ্যাটের ভেতরের ৩টি ডটকে ব্যাকগ্রাউন্ড কালার দিয়ে ফাঁকা করা হয়েছে
            customStyles = " [&>path:not(:first-child)]:!stroke-background";
          } else if (label === "Notifications") {
            iconFill = "currentColor";
            // বেলের নিচের নোস/ঝুলন্ত অংশটিকে ভরাট হতে বাধা দেওয়া হয়েছে
            customStyles = " [&>path:last-child]:!fill-none";
          }
        }

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
                className={`h-6 w-6${customStyles}`}
                strokeWidth={2.25} // নির্দেশ অনুযায়ী সব সময় একই পরিমাণ বোল্ড থাকবে
                fill={iconFill}
              />
              
              // সার্চ আইকনে ক্লিক করলে ভেতরের ডট লজিক (cx=11, cy=11 এর উপর ভিত্তি করে)
              {isActive && label === "Search" && (
                <div className="absolute top-[11px] left-[11px] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              )}
              
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
