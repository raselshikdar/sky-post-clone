import { useState, useEffect } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "Users I follow" },
  { value: "no_one", label: "No one" },
] as const;

export default function ChatSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["chat_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("chat_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [selected, setSelected] = useState("everyone");

  useEffect(() => {
    if (settings) setSelected(settings.allow_messages_from);
  }, [settings]);

  const handleChange = async (value: string) => {
    if (!user) return;
    setSelected(value);

    if (settings) {
      await supabase
        .from("chat_settings")
        .update({ allow_messages_from: value, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("chat_settings")
        .insert({ user_id: user.id, allow_messages_from: value });
    }

    queryClient.invalidateQueries({ queryKey: ["chat_settings"] });
    toast.success("Chat settings updated");
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-[49px] lg:top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">Chat Settings</h2>
      </div>

      <div className="px-4 py-5">
        <h3 className="text-lg font-bold mb-4">Allow new messages from</h3>

        <div className="space-y-1">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleChange(opt.value)}
              className="flex w-full items-center justify-between py-3.5 text-left"
            >
              <span className="text-[15px]">{opt.label}</span>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  selected === opt.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                }`}
              >
                {selected === opt.value && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">
            You can continue ongoing conversations regardless of which setting you choose.
          </p>
        </div>
      </div>
    </div>
  );
}
