import React, { useLayoutEffect, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "next-themes";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AppLayout from "@/components/AppLayout";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import PostDetail from "@/pages/PostDetail";
import HashtagPage from "@/pages/HashtagPage";
import TrendingTopicPage from "@/pages/TrendingTopicPage";
import Notifications from "@/pages/Notifications";
import SearchPage from "@/pages/SearchPage";
import Feeds from "@/pages/Feeds";
import Lists from "@/pages/Lists";
import SavedPosts from "@/pages/SavedPosts";
import FeedSettings from "@/pages/FeedSettings";
import ContentMediaSettings from "@/pages/ContentMediaSettings";
import SettingsPage from "@/pages/Settings";
import Messages from "@/pages/Messages";
import Conversation from "@/pages/Conversation";
import ChatSettings from "@/pages/ChatSettings";
import NotificationSettings from "@/pages/NotificationSettings";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
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
import AdminContent from "@/pages/admin/AdminContent";
import LandingPage from "@/pages/LandingPage";
import PublicFeed from "@/pages/PublicFeed";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import FeedbackPage from "@/pages/FeedbackPage";

// Android specific imports
import { useBackButton } from "./hooks/use-back-button";
import { useStatusBar } from "./hooks/use-status-bar";
import { PullToRefresh } from "./components/PullToRefresh";

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30, refetchOnWindowFocus: false, retry: 1 },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <LandingPage />;
  return <AppLayout homeOverride={<Home />} />;
}

function ExploreRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <PublicFeed />;
}

function AppPlugins() {
  const { theme } = useTheme();
  useBackButton();
  useStatusBar(theme);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error("SW Register Error:", err));
    }
  }, []);

  return (
    <>
      <ScrollToTop />
      <PullToRefresh />
    </>
  );
}

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <AppPlugins />
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/explore" element={<ExploreRoute />} />
                  <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/feeds" element={<Feeds />} />
                    <Route path="/feeds/settings" element={<FeedSettings />} />
                    <Route path="/settings/content-and-media" element={<ContentMediaSettings />} />
                    <Route path="/lists" element={<Lists />} />
                    <Route path="/saved" element={<SavedPosts />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/notifications/settings" element={<NotificationSettings />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/post/:postId" element={<PostDetail />} />
                    <Route path="/hashtag/:tag" element={<HashtagPage />} />
                    <Route path="/trending/:topic" element={<TrendingTopicPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/messages/settings" element={<ChatSettings />} />
                    <Route path="/messages/:conversationId" element={<Conversation />} />
                    <Route path="/support" element={<SupportTicketForm />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/verification/apply" element={<VerificationApply />} />
                  </Route>
                  <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                    <Route index element={<AdminOverview />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="moderation" element={<AdminModeration />} />
                    <Route path="content" element={<AdminContent />} />
                    <Route path="feeds" element={<AdminFeeds />} />
                    <Route path="verification" element={<AdminVerification />} />
                    <Route path="support" element={<AdminSupport />} />
                    <Route path="roles" element={<AdminRoles />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </HashRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
