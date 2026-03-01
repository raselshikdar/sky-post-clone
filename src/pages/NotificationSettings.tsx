import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Heart, UserPlus, MessageCircle, AtSign,
  Repeat2, Bell, ChevronRight, Quote
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const NOTIFICATION_TYPES = [
  { key: "likes", label: "Likes", icon: Heart, defaults: { in_app: true, push: true, from_who: "everyone" } },
  { key: "follows", label: "New followers", icon: UserPlus, defaults: { in_app: true, push: false, from_who: "everyone" } },
  { key: "replies", label: "Replies", icon: MessageCircle, defaults: { in_app: true, push: true, from_who: "everyone" } },
  { key: "mentions", label: "Mentions", icon: AtSign, defaults: { in_app: true, push: true, from_who: "everyone" } },
  { key: "quotes", label: "Quotes", icon: Quote, defaults: { in_app: true, push: true, from_who: "everyone" } },
  { key: "reposts", label: "Reposts", icon: Repeat2, defaults: { in_app: true, push: true, from_who: "everyone" } },
  { key: "activity", label: "Activity from others", icon: Bell, defaults: { in_app: true, push: true, from_who: "everyone" } },
];

const FROM_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "People I follow" },
  { value: "no_one", label: "No one" },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: settings = [] } = useQuery({
    queryKey: ["notification_settings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const settingsMap: Record<string, any> = {};
  settings.forEach((s: any) => { settingsMap[s.notification_type] = s; });

  const getSetting = (type: string) => {
    const existing = settingsMap[type];
    const typeDef = NOTIFICATION_TYPES.find((t) => t.key === type);
    return {
      in_app: existing?.in_app ?? typeDef?.defaults.in_app ?? true,
      push: existing?.push ?? typeDef?.defaults.push ?? true,
      from_who: existing?.from_who ?? typeDef?.defaults.from_who ?? "everyone",
    };
  };

  const updateSetting = useMutation({
    mutationFn: async ({ type, field, value }: { type: string; field: string; value: any }) => {
      const existing = settingsMap[type];
      const current = getSetting(type);

      if (existing) {
        await supabase
          .from("notification_settings")
          .update({ [field]: value, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("notification_settings")
          .insert({
            user_id: user!.id,
            notification_type: type,
            in_app: current.in_app,
            push: current.push,
            from_who: current.from_who,
            [field]: value,
          } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_settings"] });
      toast.success("Setting updated");
    },
  });

  const selectedTypeDef = NOTIFICATION_TYPES.find((t) => t.key === selectedType);
  const selectedSetting = selectedType ? getSetting(selectedType) : null;

  const getSubtext = (type: string) => {
    const s = getSetting(type);
    const parts: string[] = [];
    if (s.in_app) parts.push("In-app");
    if (s.push) parts.push("Push");
    if (parts.length === 0) parts.push("Off");
    const fromText = s.from_who === "everyone" ? "Everyone" : s.from_who === "following" ? "Following" : "No one";
    return `${parts.join(", ")}, ${fromText}`;
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-49px)]">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold">Notifications</h2>
      </div>

      {/* Settings list */}
      <div className="py-1">
        {NOTIFICATION_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-accent/30 transition-colors"
            >
              <Icon className="h-5 w-5 text-foreground flex-shrink-0" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[15px]">{type.label}</p>
                <p className="text-sm text-muted-foreground">{getSubtext(type.key)}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedType} onOpenChange={(v) => !v && setSelectedType(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              {selectedTypeDef && <selectedTypeDef.icon className="h-5 w-5" />}
              {selectedTypeDef?.label}
            </SheetTitle>
          </SheetHeader>

          {selectedSetting && selectedType && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">In-app notifications</p>
                  <p className="text-sm text-muted-foreground">Show in notification feed</p>
                </div>
                <Switch
                  checked={selectedSetting.in_app}
                  onCheckedChange={(v) => updateSetting.mutate({ type: selectedType, field: "in_app", value: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push notifications</p>
                  <p className="text-sm text-muted-foreground">Send push notifications</p>
                </div>
                <Switch
                  checked={selectedSetting.push}
                  onCheckedChange={(v) => updateSetting.mutate({ type: selectedType, field: "push", value: v })}
                />
              </div>

              <div>
                <p className="font-medium mb-2">Receive from</p>
                <div className="space-y-2">
                  {FROM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateSetting.mutate({ type: selectedType, field: "from_who", value: opt.value })}
                      className={`w-full rounded-lg px-4 py-3 text-sm text-left transition-colors ${
                        selectedSetting.from_who === opt.value
                          ? "bg-primary/10 text-primary font-medium border border-primary/30"
                          : "border border-border hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
