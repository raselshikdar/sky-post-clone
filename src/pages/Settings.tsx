import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <h2 className="text-lg font-bold">Settings</h2>
      </div>
      <div className="p-4 space-y-4">
        <Button variant="destructive" onClick={handleSignOut} className="w-full rounded-full">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
