import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface InteractionSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (label: string) => void;
}

export default function InteractionSettings({ open, onOpenChange, onSave }: InteractionSettingsProps) {
  const [whoCanReply, setWhoCanReply] = useState<"anyone" | "nobody">("anyone");
  const [yourFollowers, setYourFollowers] = useState(false);
  const [peopleYouFollow, setPeopleYouFollow] = useState(false);
  const [peopleYouMention, setPeopleYouMention] = useState(false);
  const [allowQuotePosts, setAllowQuotePosts] = useState(true);

  const handleSave = () => {
    let label = "Anyone can interact";
    if (whoCanReply === "nobody") {
      const extras: string[] = [];
      if (yourFollowers) extras.push("followers");
      if (peopleYouFollow) extras.push("following");
      if (peopleYouMention) extras.push("mentioned");
      label = extras.length > 0 ? `${extras.join(", ")} can reply` : "Nobody can reply";
    }
    onSave(label);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold">Post interaction settings</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* Who can reply */}
          <div>
            <p className="text-base font-semibold mb-3">Who can reply</p>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setWhoCanReply("anyone")}
                className={`flex-1 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  whoCanReply === "anyone" ? "bg-primary/10 text-primary ring-2 ring-primary" : "bg-secondary text-foreground"
                }`}
              >
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  whoCanReply === "anyone" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {whoCanReply === "anyone" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
                Anyone
              </button>
              <button
                onClick={() => setWhoCanReply("nobody")}
                className={`flex-1 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  whoCanReply === "nobody" ? "bg-primary/10 text-primary ring-2 ring-primary" : "bg-secondary text-foreground"
                }`}
              >
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  whoCanReply === "nobody" ? "border-primary" : "border-muted-foreground"
                }`}>
                  {whoCanReply === "nobody" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
                Nobody
              </button>
            </div>

            {/* Conditional checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 cursor-pointer">
                <Checkbox checked={yourFollowers} onCheckedChange={(c) => setYourFollowers(!!c)} />
                <span className="text-sm font-medium">Your followers</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 cursor-pointer">
                <Checkbox checked={peopleYouFollow} onCheckedChange={(c) => setPeopleYouFollow(!!c)} />
                <span className="text-sm font-medium">People you follow</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 cursor-pointer">
                <Checkbox checked={peopleYouMention} onCheckedChange={(c) => setPeopleYouMention(!!c)} />
                <span className="text-sm font-medium">People you mention</span>
              </label>
            </div>
          </div>

          {/* Allow quote posts */}
          <label className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3.5 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-lg">❝❞</span>
              <span className="text-sm font-medium">Allow quote posts</span>
            </div>
            <Switch checked={allowQuotePosts} onCheckedChange={setAllowQuotePosts} />
          </label>

          <p className="text-sm text-muted-foreground">These are your default settings</p>

          <button
            onClick={handleSave}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
