import { Hash, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import MobileDrawer from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import DoyelLogo from "@/components/DoyelLogo";

export default function MobileTopBar() {
  const { profile } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm lg:hidden">
        <button onClick={() => setDrawerOpen(true)} className="p-1">
          <Menu className="h-6 w-6 text-foreground" strokeWidth={2} />
        </button>

        <DoyelLogo className="h-8 w-8" />

        <button onClick={() => navigate("/feeds")} className="p-1">
          <Hash className="h-6 w-6 text-foreground" strokeWidth={2} />
        </button>
      </header>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
