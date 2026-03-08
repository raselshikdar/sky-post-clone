import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AwajLogo from "@/components/AwajLogo";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast.error(t("reset.invalid_link"));
      navigate("/auth");
    }
  }, [navigate, t]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (password !== confirmPassword) { setError(t("reset.no_match")); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) { setError(err.message || "Could not reset password"); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("reset.updated")}</h1>
          <p className="text-muted-foreground text-sm mb-6">{t("reset.updated_desc")}</p>
          <Button className="w-full" onClick={() => navigate("/home")}>{t("reset.continue")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <AwajLogo className="mb-4 h-14 w-14" />
          <h1 className="text-2xl font-bold text-foreground">{t("reset.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("reset.desc")}</p>
        </div>
        <form onSubmit={handleReset} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showPassword ? "text" : "password"} placeholder={t("reset.new_password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-10 pr-10 h-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showPassword ? "text" : "password"} placeholder={t("reset.confirm")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="pl-10 h-11" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? t("reset.updating") : t("reset.update_btn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
