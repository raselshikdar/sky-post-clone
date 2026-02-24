import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
}

const MAX_CHARS = 300;

export default function Composer({ open, onOpenChange, parentId }: ComposerProps) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const remaining = MAX_CHARS - content.length;
  const overLimit = remaining < 0;

  const handlePost = async () => {
    if (!user || !content.trim() || overLimit) return;
    setPosting(true);
    try {
      await supabase.from("posts").insert({
        author_id: user.id,
        content: content.trim(),
        parent_id: parentId || null,
      });
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      onOpenChange(false);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-3">
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <DialogTitle className="sr-only">New Post</DialogTitle>
          <Button
            size="sm"
            onClick={handlePost}
            disabled={!content.trim() || overLimit || posting}
            className="rounded-full px-5 font-semibold"
          >
            {parentId ? "Reply" : "Post"}
          </Button>
        </DialogHeader>

        <div className="flex gap-3 p-4">
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {profile?.display_name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <textarea
              className="min-h-[120px] w-full resize-none bg-transparent text-lg placeholder:text-muted-foreground focus:outline-none"
              placeholder={parentId ? "Write your reply" : "What's up?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex gap-1">
            <button className="rounded-full p-2 text-primary transition-colors hover:bg-primary/10">
              <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
          <div className={`text-sm font-medium ${overLimit ? "text-destructive" : remaining <= 20 ? "text-orange-500" : "text-muted-foreground"}`}>
            {remaining}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
