import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminCounts {
  support: number; // open + in_progress tickets
  supportNewUserMsgs: number; // tickets that have a more recent user msg than admin reply
  verification: number; // pending verification requests
  reports: number; // post reports
  accountReports: number; // account reports
}

/**
 * Counts of items needing admin attention. Used to render badges
 * next to admin sidebar links.
 */
export function useAdminBadgeCounts(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery<AdminCounts>({
    queryKey: ["admin_badge_counts"],
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [supportRes, verifRes, reportsRes, acctRes] = await Promise.all([
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
      ]);

      return {
        support: supportRes.count || 0,
        supportNewUserMsgs: 0,
        verification: verifRes.count || 0,
        reports: reportsRes.count || 0,
        accountReports: acctRes.count || 0,
      };
    },
  });

  // Realtime: invalidate when relevant tables change
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("admin-badge-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () =>
        qc.invalidateQueries({ queryKey: ["admin_badge_counts"] })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "support_ticket_messages" }, () =>
        qc.invalidateQueries({ queryKey: ["admin_badge_counts"] })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, () =>
        qc.invalidateQueries({ queryKey: ["admin_badge_counts"] })
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () =>
        qc.invalidateQueries({ queryKey: ["admin_badge_counts"] })
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "account_reports" }, () =>
        qc.invalidateQueries({ queryKey: ["admin_badge_counts"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);

  return query.data;
}
