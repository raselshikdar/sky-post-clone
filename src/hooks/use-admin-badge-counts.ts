import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminCounts {
  support: number; // open + in_progress tickets
  supportNewUserMsgs: number;
  verification: number; // pending verification requests
  reports: number; // post reports
  accountReports: number; // account reports
  topicReports: number; // trending topic reports
  moderation: number; // combined: post + account + topic reports
}

/**
 * Counts of items needing admin attention. Used to render badges
 * next to admin sidebar links. Real-time updates on INSERT/DELETE
 * so counts return to zero when admins resolve items.
 */
export function useAdminBadgeCounts(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery<AdminCounts>({
    queryKey: ["admin_badge_counts"],
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [supportRes, verifRes, reportsRes, acctRes, topicRes] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        supabase
          .from("verification_requests" as any)
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("account_reports")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("trending_topic_reports" as any)
          .select("*", { count: "exact", head: true }),
      ]);

      const reports = reportsRes.count || 0;
      const accountReports = acctRes.count || 0;
      const topicReports = topicRes.count || 0;

      return {
        support: supportRes.count || 0,
        supportNewUserMsgs: 0,
        verification: verifRes.count || 0,
        reports,
        accountReports,
        topicReports,
        moderation: reports + accountReports + topicReports,
      };
    },
  });

  // Realtime: invalidate when relevant tables change (any event, so
  // DELETE from admins dismissing a report decrements the badge).
  useEffect(() => {
    if (!enabled) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_badge_counts"] });
    const channel = supabase
      .channel("admin-badge-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_ticket_messages" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "account_reports" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "trending_topic_reports" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);

  return query.data;
}
