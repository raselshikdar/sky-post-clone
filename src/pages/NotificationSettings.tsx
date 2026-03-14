import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Heart, UserPlus, MessageCircle, AtSign, Repeat2, Bell, ChevronRight, Quote, BellRing, BellOff } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { t } = useTranslation();
  const { isSubscribed, isSupported, permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  const NOTIFICATION_TYPES = [
    { key: "likes", label: t("notif_settings.likes"), icon: Heart, defaults: { in_app: true, push: true, from_who: "everyone" } },
    { key: "follows", label: t("notif_settings.new_followers"), icon: UserPlus, defaults: { in_app: true, push: false, from_who: "everyone" } },
    { key: "replies", label: t("notif_settings.replies"), icon: MessageCircle, defaults: { in_app: true, push: true, from_who: "everyone" } },
    { key: "mentions", label: t("notif_settings.mentions"), icon: AtSign, defaults: { in_app: true, push: true, from_who: "everyone" } },
    { key: "quotes", label: t("notif_settings.quotes"), icon: Quote, defaults: { in_app: true, push: true, from_who: "everyone" } },
    { key: "reposts", label: t("notif_settings.reposts"), icon: Repeat2, defaults: { in_app: true, push: true, from_who: "everyone" } },
    { key: "activity", label: t("notif_settings.activity"), icon: Bell, defaults: { in_app: true, push: true, from_who: "everyone" } },
  ];

  const FROM_OPTIONS = [
    { value: "everyone", label: t("notif_settings.everyone") },
    { value: "following", label: t("notif_settings.people_follow") },
    { value: "no_one", label: t("notif_settings.no_one") },
  ];

  const { data: settings = [] } = useQuery({
    queryKey: ["notification_settings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("notification_settings").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const settingsMap: Record<string, any> = {};
  settings.forEach((s: any) => { settingsMap[s.notification_type] = s; });

  const getSetting = (type: string) => {
    const existing = settingsMap[type];
    const typeDef = NOTIFICATION_TYPES.find((nt) => nt.key === type);
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
        await supabase.from("notification_settings").update({ [field]: value, updated_at: new Date().toISOString() } as any).eq("id", existing.id);
      } else {
        await supabase.from("notification_settings").insert({ user_id: user!.id, notification_type: type, in_app: current.in_app, push: current.push, from_who: current.from_who, [field]: value } as any);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notification_settings"] }); toast.success(t("privacy.setting_updated")); },
  });

  const selectedTypeDef = NOTIFICATION_TYPES.find((nt) => nt.key === selectedType);
  const selectedSetting = selectedType ? getSetting(selectedType) : null;

  const getSubtext = (type: string) => {
    const s = getSetting(type);
    const parts: string[] = [];
    if (s.in_app) parts.push(t("notif_settings.in_app"));
    if (s.push) parts.push(t("notif_settings.push"));
    if (parts.length === 0) parts.push("Off");
    const fromText = s.from_who === "everyone" ? t("notif_settings.everyone") : s.from_who === "following" ? t("notif_settings.people_follow") : t("notif_settings.no_one");
    return `${parts.join(", ")}, ${fromText}`;
  };

  const handlePushToggle = async () => {
    if (pushLoading) return;
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Push notifications disabled");
    } else {
      const success = await subscribe();
      if (success) {
        toast.success("Push notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Push notifications are blocked. Please enable them in your browser settings.");
      } else {
        toast.error("Failed to enable push notifications");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{t("notif_settings.title")}</h2>
      </div>

      {/* Push Notifications Global Toggle */}
      {isSupported && (
        <div className="border-b border-border">
          <button
            onClick={handlePushToggle}
            disabled={pushLoading}
            className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-accent/30 transition-colors"
          >
            {isSubscribed ? (
              <BellRing className="h-5 w-5 text-primary flex-shrink-0" strokeWidth={1.75} />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[15px]">
                {isSubscribed ? "Push Notifications Enabled" : "Enable Push Notifications"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed
                  ? "You'll receive alerts even when the app is closed"
                  : permission === "denied"
                  ? "Blocked by browser — check your browser settings"
                  : "Get notified even when the app is closed"}
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handlePushToggle}
              disabled={pushLoading}
            />
          </button>
        </div>
      )}

      <div className="py-1">
        {NOTIFICATION_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button key={type.key} onClick={() => setSelectedType(type.key)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-accent/30 transition-colors">
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
                <div><p className="font-medium">{t("notif_settings.in_app")}</p><p className="text-sm text-muted-foreground">{t("notif_settings.in_app_desc")}</p></div>
                <Switch checked={selectedSetting.in_app} onCheckedChange={(v) => updateSetting.mutate({ type: selectedType, field: "in_app", value: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="font-medium">{t("notif_settings.push")}</p><p className="text-sm text-muted-foreground">{t("notif_settings.push_desc")}</p></div>
                <Switch checked={selectedSetting.push} onCheckedChange={(v) => updateSetting.mutate({ type: selectedType, field: "push", value: v })} />
              </div>
              <div>
                <p className="font-medium mb-2">{t("notif_settings.receive_from")}</p>
                <div className="space-y-2">
                  {FROM_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => updateSetting.mutate({ type: selectedType, field: "from_who", value: opt.value })}
                      className={`w-full rounded-lg px-4 py-3 text-sm text-left transition-colors ${selectedSetting.from_who === opt.value ? "bg-primary/10 text-primary font-medium border border-primary/30" : "border border-border hover:bg-accent"}`}>
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
