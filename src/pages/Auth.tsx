import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AwajLogo from "@/components/AwajLogo";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

type View = "signin" | "signup" | "forgot" | "verify-email";

export default function Auth() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialView = searchParams.get("view") === "signup" ? "signup" : "signin";
  const [view, setView] = useState<View>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const resetForm = () => { setError(""); setEmail(""); setPassword(""); setUsername(""); setDisplayName(""); };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await signIn(email, password); navigate("/"); }
    catch (err: any) { setError(err.message || "Invalid email or password"); }
    finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await signUp(email, password, username, displayName); setView("verify-email"); }
    catch (err: any) { setError(err.message || "Could not create account"); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      toast.success(t("auth.send_reset")); setView("signin");
    } catch (err: any) { setError(err.message || "Could not send reset email"); }
    finally { setLoading(false); }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) throw error;
    } catch (err: any) { setError(err.message || `Could not sign in with ${provider}`); }
    finally { setOauthLoading(null); }
  };

  const SocialButtons = () => (
    <div className="space-y-3">
      <Button variant="outline" className="w-full h-11 gap-3 text-sm font-medium" onClick={() => handleOAuth("google")} disabled={!!oauthLoading}>
        {oauthLoading === "google" ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : (
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        )}
        {t("auth.google")}
      </Button>
      <Button variant="outline" className="w-full h-11 gap-3 text-sm font-medium" onClick={() => handleOAuth("apple")} disabled={!!oauthLoading}>
        {oauthLoading === "apple" ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
        )}
        {t("auth.apple")}
      </Button>
    </div>
  );

  const Divider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-3 text-muted-foreground">{t("auth.or")}</span>
      </div>
    </div>
  );

  if (view === "verify-email") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.check_email")}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {t("auth.verification_sent")}<br /><span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-muted-foreground text-xs mb-8">{t("auth.check_spam")}</p>
          <Button variant="outline" className="w-full" onClick={() => { resetForm(); setView("signin"); }}>
            {t("auth.back_signin")}
          </Button>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <button onClick={() => { setError(""); setView("signin"); }} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> {t("auth.back_to_signin")}
          </button>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.reset_password")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.reset_desc")}</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 h-11" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? t("auth.loading") : t("auth.send_reset")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <AwajLogo className="mb-4 h-14 w-14" />
          <h1 className="text-2xl font-bold text-foreground">
            {view === "signup" ? t("auth.join") : t("auth.welcome_back")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "signup" ? t("auth.sign_up_desc") : t("auth.sign_in_desc")}
          </p>
        </div>
        <SocialButtons />
        <Divider />
        <form onSubmit={view === "signup" ? handleSignUp : handleSignIn} className="space-y-3">
          {view === "signup" && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("auth.username")} value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" className="pl-10 h-11" />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("auth.display_name")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="pl-10 h-11" />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={view === "signup" ? "email" : "text"} placeholder={view === "signup" ? t("auth.email") : t("auth.email_or_username")} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete={view === "signup" ? "email" : "username"} className="pl-10 h-11" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showPassword ? "text" : "password"} placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={view === "signup" ? "new-password" : "current-password"} className="pl-10 pr-10 h-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {view === "signin" && (
            <div className="flex justify-end">
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setError(""); setView("forgot"); }}>
                {t("auth.forgot_password")}
              </button>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? t("auth.loading") : view === "signup" ? t("auth.create_account") : t("auth.sign_in")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {view === "signup" ? t("auth.have_account") : t("auth.no_account")}{" "}
          <button type="button" className="text-primary font-medium hover:underline" onClick={() => { setView(view === "signup" ? "signin" : "signup"); setError(""); }}>
            {view === "signup" ? t("auth.sign_in") : t("auth.sign_up")}
          </button>
        </p>
      </div>
    </div>
  );
}
