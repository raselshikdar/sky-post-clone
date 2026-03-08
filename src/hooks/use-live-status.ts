import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if a user is currently live streaming.
 * Returns the live_status row if live, or null.
 */
export function useLiveStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ["liveStatus", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("live_status")
        .select("*")
        .eq("user_id", userId)
        .eq("is_live", true)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

/**
 * Hook to get all currently live users.
 */
export function useAllLiveUsers() {
  return useQuery({
    queryKey: ["allLiveStatuses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_status")
        .select("*, profiles:user_id (id, username, display_name, avatar_url)")
        .eq("is_live", true)
        .order("started_at", { ascending: false });
      return data || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
