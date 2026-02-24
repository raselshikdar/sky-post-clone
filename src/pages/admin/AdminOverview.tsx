import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Flag, MessageSquareText, UserCheck, UserX } from "lucide-react";

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [users, posts, reports, accountReports, tickets, suspensions, verified] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("account_reports").select("*", { count: "exact", head: true }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("user_suspensions").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("verified_users").select("*", { count: "exact", head: true }),
      ]);
      return {
        users: users.count || 0,
        posts: posts.count || 0,
        reports: (reports.count || 0) + (accountReports.count || 0),
        openTickets: tickets.count || 0,
        suspendedUsers: suspensions.count || 0,
        verifiedUsers: verified.count || 0,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.users, icon: Users, color: "text-primary" },
    { label: "Total Posts", value: stats?.posts, icon: FileText, color: "text-primary" },
    { label: "Open Reports", value: stats?.reports, icon: Flag, color: "text-destructive" },
    { label: "Open Tickets", value: stats?.openTickets, icon: MessageSquareText, color: "text-[hsl(var(--bsky-repost))]" },
    { label: "Verified Users", value: stats?.verifiedUsers, icon: UserCheck, color: "text-primary" },
    { label: "Suspended", value: stats?.suspendedUsers, icon: UserX, color: "text-destructive" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? <span className="h-4 w-12 animate-pulse rounded bg-muted inline-block" /> : value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
