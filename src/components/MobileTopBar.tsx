import { CloudSun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

export default function MobileTopBar() {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm lg:hidden">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile?.avatar_url} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {profile?.display_name?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      <CloudSun className="h-7 w-7 text-primary" strokeWidth={1.5} />

      <div className="w-8" /> {/* Spacer for symmetry */}
    </header>
  );
}
