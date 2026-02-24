import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import AppLayout from "@/components/AppLayout";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import PostDetail from "@/pages/PostDetail";
import Notifications from "@/pages/Notifications";
import SearchPage from "@/pages/SearchPage";
import Feeds from "@/pages/Feeds";
import FeedSettings from "@/pages/FeedSettings";
import SettingsPage from "@/pages/Settings";
import Messages from "@/pages/Messages";
import Conversation from "@/pages/Conversation";
import ChatSettings from "@/pages/ChatSettings";
import NotificationSettings from "@/pages/NotificationSettings";
import NotFound from "@/pages/NotFound";
import SupportTicketForm from "@/pages/SupportTicketForm";
import VerificationApply from "@/pages/VerificationApply";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminModeration from "@/pages/admin/AdminModeration";
import AdminFeeds from "@/pages/admin/AdminFeeds";
import AdminVerification from "@/pages/admin/AdminVerification";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminRoles from "@/pages/admin/AdminRoles";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/feeds" element={<Feeds />} />
                <Route path="/feeds/settings" element={<FeedSettings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/notifications/settings" element={<NotificationSettings />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/settings" element={<ChatSettings />} />
                <Route path="/messages/:conversationId" element={<Conversation />} />
                <Route path="/support" element={<SupportTicketForm />} />
                <Route path="/verification/apply" element={<VerificationApply />} />
              </Route>
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="moderation" element={<AdminModeration />} />
                <Route path="feeds" element={<AdminFeeds />} />
                <Route path="verification" element={<AdminVerification />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="roles" element={<AdminRoles />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
