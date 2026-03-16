import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

interface MuteWordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MuteWordsDialog({ open, onOpenChange }: MuteWordsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [newWord, setNewWord] = useState("");

  const { data: mutedWords = [] } = useQuery({
    queryKey: ["muted_words", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("muted_words").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && open,
  });

  const handleAdd = async () => {
    if (!user || !newWord.trim()) return;
    const word = newWord.trim().toLowerCase();
    const { error } = await supabase.from("muted_words").insert({ user_id: user.id, word });
    if (error?.code === "23505") { toast.info(t("menu.word_already_muted")); return; }
    if (error) { toast.error("Failed to add muted word"); return; }
    setNewWord("");
    toast.success(t("menu.word_muted"));
    queryClient.invalidateQueries({ queryKey: ["muted_words"] });
  };

  const handleRemove = async (id: string) => {
    if (!user) return;
    await supabase.from("muted_words").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["muted_words"] });
    toast.success(t("menu.word_unmuted"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t("menu.mute_words")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder={t("menu.mute_words_placeholder")}
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={!newWord.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
          {mutedWords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("menu.no_muted_words")}</p>
          ) : (
            mutedWords.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50">
                <span className="text-sm text-foreground">{item.word}</span>
                <button onClick={() => handleRemove(item.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
