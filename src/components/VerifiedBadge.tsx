import { BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VerifiedBadgeProps {
  userId: string;
  className?: string;
}

export default function VerifiedBadge({ userId, className = "h-4 w-4" }: VerifiedBadgeProps) {
  const { data } = useQuery({
    queryKey: ["badge_status", userId],
    queryFn: async () => {
      // Check roles and verified status in parallel
      const [rolesRes, verifiedRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("verified_users").select("id").eq("user_id", userId).maybeSingle(),
      ]);
      const roles = (rolesRes.data || []).map((r: any) => r.role);
      const isStaff = roles.includes("admin") || roles.includes("moderator");
      const isVerified = !!verifiedRes.data;
      return { isStaff, isVerified };
    },
    staleTime: 60000,
  });

  if (!data) return null;

  if (data.isStaff) {
    return (
      <BadgeCheck
        className={`${className} shrink-0`}
        style={{ color: "hsl(45, 93%, 47%)" }}
        fill="hsl(45, 93%, 47%)"
        stroke="hsl(var(--background))"
        strokeWidth={2.5}
      />
    );
  }

  if (data.isVerified) {
    return (
      <BadgeCheck
        className={`${className} text-primary shrink-0`}
      />
    );
  }

  return null;
}
