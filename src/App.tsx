import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";

const Home = lazy(() => import("@/pages/Home"));
const Auth = lazy(() => import("@/pages/Auth"));
const Profile = lazy(() => import("@/pages/Profile"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));
const HashtagPage = lazy(() => import("@/pages/HashtagPage"));
const TrendingTopicPage = lazy(() => import("@/pages/TrendingTopicPage"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const Feeds = lazy(() => import("@/pages/Feeds"));
const Lists = lazy(() => import("@/pages/Lists"));
const SavedPosts = lazy(() => import("@/pages/SavedPosts"));
const FeedSettings = lazy(() => import("@/pages/FeedSettings"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const Messages = lazy(() => import("@/pages/Messages"));
const Conversation = lazy(() => import("@/pages/Conversation"));
const ChatSettings = lazy(() => import("@/pages/ChatSettings"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const SupportTicketForm = lazy(() => import("@/pages/SupportTicketForm"));
const VerificationApply = lazy(() => import("@/pages/VerificationApply"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminModeration = lazy(() => import("@/pages/admin/AdminModeration"));
const AdminFeeds = lazy(() => import("@/pages/admin/AdminFeeds"));
const AdminVerification = lazy(() => import("@/pages/admin/AdminVerification"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminRoles = lazy(() => import("@/pages/admin/AdminRoles"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const PublicFeed = lazy(() => import("@/pages/PublicFeed"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — data stays fresh, no refetch on mount/focus
      gcTime: 1000 * 60 * 30, // 30 minutes — keep unused data in cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

/** Root route: authenticated → Home feed in AppLayout, unauthenticated → Landing page */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return <LandingPage />;
  return <AppLayout homeOverride={<Home />} />;
}

/** Explore route: authenticated → redirect to /, unauthenticated → public feed */
function ExploreRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <PublicFeed />;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/explore" element={<ExploreRoute />} />
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/search" element={<SearchPage />} />
                <Route path="/feeds" element={<Feeds />} />
                <Route path="/feeds/settings" element={<FeedSettings />} />
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
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
