import { Outlet, useLocation } from "react-router-dom";
import DesktopSidebar from "@/components/DesktopSidebar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import RightSidebar from "@/components/RightSidebar";
import { useState } from "react";
import { SquarePen } from "lucide-react";
import Composer from "@/components/Composer";
import LiveChatFAB from "@/components/LiveChatFAB";

interface AppLayoutProps {
  homeOverride?: React.ReactNode;
}

export default function AppLayout({ homeOverride }: AppLayoutProps = {}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const { pathname } = useLocation();
  const isMessagesPage = pathname.startsWith("/messages");
  const isConversation = /^\/messages\/[^/]+$/.test(pathname) && pathname !== "/messages/settings";
  const isHome = pathname === "/" || !!homeOverride;

  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <DesktopSidebar />

      <div className="flex w-full max-w-feed flex-col border-x border-border min-h-screen">
        {isHome && <MobileTopBar />}
        {homeOverride || <Outlet />}
        {!isConversation && <div className="h-16 lg:hidden" />}
      </div>

      <RightSidebar />

      {pathname === "/support" ? (
        <LiveChatFAB />
      ) : !isMessagesPage && (
        <button
          className="fab-button"
          onClick={() => setComposerOpen(true)}
        >
          <SquarePen className="h-6 w-6" strokeWidth={1.75} />
        </button>
      )}

      <Composer open={composerOpen} onOpenChange={setComposerOpen} />

      {!isConversation && <MobileBottomNav />}
    </div>
  );
}
