import { Outlet, useLocation } from "react-router-dom";
import DesktopSidebar from "@/components/DesktopSidebar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import RightSidebar from "@/components/RightSidebar";
import { useState } from "react";
import { Plus } from "lucide-react";
import Composer from "@/components/Composer";

export default function AppLayout() {
  const [composerOpen, setComposerOpen] = useState(false);
  const { pathname } = useLocation();
  const isMessagesPage = pathname.startsWith("/messages");
  // Detect if we're inside a specific conversation (not /messages or /messages/settings)
  const isConversation = /^\/messages\/[^/]+$/.test(pathname) && pathname !== "/messages/settings";

  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <DesktopSidebar />

      <div className="flex w-full max-w-feed flex-col border-x border-border min-h-screen">
        {!isConversation && <MobileTopBar />}
        <Outlet />
        {/* Mobile bottom padding - not on conversation pages */}
        {!isConversation && <div className="h-16 lg:hidden" />}
      </div>

      <RightSidebar />

      {/* Mobile FAB - Post Composer (hidden on messages pages) */}
      {!isMessagesPage && (
        <button
          className="fab-button"
          onClick={() => setComposerOpen(true)}
        >
          <Plus className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      <Composer open={composerOpen} onOpenChange={setComposerOpen} />

      {/* Hide bottom nav on conversation pages (like WhatsApp) */}
      {!isConversation && <MobileBottomNav />}
    </div>
  );
}
