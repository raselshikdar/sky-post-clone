import { Hash, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import MobileDrawer from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";

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

        {/* Bluesky butterfly logo */}
        <svg viewBox="0 0 64 57" className="h-8 w-8 text-primary" fill="currentColor">
          <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745z" />
        </svg>

        <button onClick={() => navigate("/feeds")} className="p-1">
          <Hash className="h-6 w-6 text-foreground" strokeWidth={2} />
        </button>
      </header>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
