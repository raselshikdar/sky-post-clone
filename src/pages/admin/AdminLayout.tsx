import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/use-role";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Shield, BarChart3, Rss, BadgeCheck, MessageSquareText, ArrowLeft, Settings2, FileText, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const adminNavItems = [
  { label: "Overview", path: "/admin", icon: BarChart3, adminOnly: false },
  { label: "Users", path: "/admin/users", icon: Users, adminOnly: false },
  { label: "Moderation", path: "/admin/moderation", icon: Shield, adminOnly: false },
  { label: "Content", path: "/admin/content", icon: FileText, adminOnly: false },
  { label: "Feeds", path: "/admin/feeds", icon: Rss, adminOnly: true },
  { label: "Verification", path: "/admin/verification", icon: BadgeCheck, adminOnly: true },
  { label: "Support", path: "/admin/support", icon: MessageSquareText, adminOnly: false },
  { label: "Roles", path: "/admin/roles", icon: Settings2, adminOnly: true },
];

export default function AdminLayout() {
  const { isAdmin, isModerator, isStaff, isLoading } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this area.</p>
        <button onClick={() => navigate("/")} className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
          Go Home
        </button>
      </div>
    );
  }

  const visibleItems = adminNavItems.filter(item => isAdmin || !item.adminOnly);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{isAdmin ? "Admin" : "Moderator"} Panel</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {visibleItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-base font-bold">{isAdmin ? "Admin" : "Mod"} Panel</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {visibleItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/admin"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-4">
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/"); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold">{isAdmin ? "Admin" : "Mod"} Panel</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-1.5 text-foreground hover:bg-accent transition-colors">
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}