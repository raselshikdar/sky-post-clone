import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MutualUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

const MOCK_MUTUAL_FOLLOWERS: MutualUser[] = [
  { id: "mock-1", username: "alice", display_name: "Alice Johnson", avatar_url: null },
  { id: "mock-2", username: "bob_dev", display_name: "Bob Smith", avatar_url: null },
  { id: "mock-3", username: "carol_writes", display_name: "Carol Lee", avatar_url: null },
  { id: "mock-4", username: "dave_photo", display_name: "Dave Chen", avatar_url: null },
  { id: "mock-5", username: "eve_design", display_name: "Eve Martinez", avatar_url: null },
];

interface MutualFollowersIndicatorProps {
  mutualFollowers: MutualUser[];
}

export default function MutualFollowersIndicator({ mutualFollowers }: MutualFollowersIndicatorProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const users = mutualFollowers.length > 0 ? mutualFollowers : MOCK_MUTUAL_FOLLOWERS;
  const previewUsers = users.slice(0, 3);
  const remaining = users.length - previewUsers.length;

  const buildText = () => {
    const names = previewUsers.map((u) => u.username);
    if (remaining > 0) {
      return `Followed by ${names.join(", ")}, and ${remaining} ${remaining === 1 ? "other" : "others"}`;
    }
    if (names.length === 1) return `Followed by ${names[0]}`;
    if (names.length === 2) return `Followed by ${names[0]} and ${names[1]}`;
    return `Followed by ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  };

  const handleUserClick = (username: string) => {
    setOpen(false);
    navigate(`/profile/${username}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-left group"
      >
        <div className="flex -space-x-1.5">
          {previewUsers.map((u) => (
            <Avatar key={u.id} className="h-6 w-6 border border-background">
              <AvatarImage src={u.avatar_url || ""} />
              <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
                {u.display_name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="text-[13px] leading-tight text-muted-foreground group-hover:underline">
          {buildText()}
        </p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-base font-bold">Known Followers</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleUserClick(u.username)}
                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {u.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
