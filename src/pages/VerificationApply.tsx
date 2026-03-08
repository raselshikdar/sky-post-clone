import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Upload, BadgeCheck, Clock, XCircle, CheckCircle2, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";

export default function VerificationApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [docType, setDocType] = useState("nid");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const docTypes = [
    { value: "nid", label: t("verify.nid") },
    { value: "driving_license", label: t("verify.driving") },
    { value: "passport", label: t("verify.passport") },
  ];

  const { data: existingRequest } = useQuery({
    queryKey: ["my_verification", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("verification_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const { data: isVerified } = useQuery({
    queryKey: ["is_verified", user?.id],
    queryFn: async () => { const { data } = await supabase.from("verified_users").select("id").eq("user_id", user!.id).maybeSingle(); return !!data; },
    enabled: !!user,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) { toast.error("Only JPG, PNG, WebP or PDF allowed"); return; }
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async () => {
    if (!file) { toast.error(t("verify.upload")); return; }
    if (!reason.trim()) { toast.error("Please describe why you want verification"); return; }
    setSubmitting(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, file);
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setSubmitting(false); return; }
    const { error } = await supabase.from("verification_requests").insert({
      user_id: user!.id,
      document_type: docType,
      document_url: path,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error("Submission failed"); } else { toast.success(t("verify.submit")); queryClient.invalidateQueries({ queryKey: ["my_verification"] }); setFile(null); setPreview(null); setReason(""); }
  };

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pending: { icon: <Clock className="h-5 w-5" />, label: "Pending Review", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" },
    reviewing: { icon: <Eye className="h-5 w-5" />, label: "Under Review", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
    approved: { icon: <CheckCircle2 className="h-5 w-5" />, label: "Approved", color: "text-green-500", bg: "bg-green-500/10 border-green-500/20" },
    rejected: { icon: <XCircle className="h-5 w-5" />, label: "Rejected", color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
  };

  const hasActiveRequest = existingRequest && (existingRequest.status === "pending" || existingRequest.status === "reviewing");

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{t("verify.title")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isVerified ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <BadgeCheck className="h-12 w-12 text-primary" />
              <h3 className="text-lg font-bold">{t("verify.verified")}</h3>
              <p className="text-sm text-muted-foreground">{t("verify.verified_desc")}</p>
            </div>
          ) : (
            <>
              {/* Status card for existing request */}
              {existingRequest && (
                <div className={`rounded-xl border p-4 space-y-3 ${statusConfig[existingRequest.status]?.bg || statusConfig.pending.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={statusConfig[existingRequest.status]?.color || "text-muted-foreground"}>
                      {statusConfig[existingRequest.status]?.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${statusConfig[existingRequest.status]?.color}`}>
                        {statusConfig[existingRequest.status]?.label || existingRequest.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(existingRequest.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Document:</span>
                      <span className="font-medium">{docTypes.find(d => d.value === existingRequest.document_type)?.label || existingRequest.document_type}</span>
                    </div>
                    {(existingRequest as any).reason && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">Your reason:</p>
                        <p className="text-foreground bg-background/50 rounded-lg p-2">{(existingRequest as any).reason}</p>
                      </div>
                    )}
                  </div>

                  {existingRequest.status === "rejected" && existingRequest.admin_notes && (
                    <div className="rounded-lg bg-destructive/10 p-2.5 space-y-1">
                      <p className="text-xs font-semibold text-destructive">Rejection Reason</p>
                      <p className="text-xs text-muted-foreground">{existingRequest.admin_notes}</p>
                    </div>
                  )}

                  {hasActiveRequest && (
                    <p className="text-xs text-muted-foreground">{t("verify.notify")}</p>
                  )}
                </div>
              )}

              {/* Show form if no active request */}
              {!hasActiveRequest && (
                <>
                  <div className="rounded-xl border border-border p-4 space-y-1">
                    <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" /><h3 className="font-semibold">{t("verify.apply")}</h3></div>
                    <p className="text-xs text-muted-foreground">{t("verify.apply_desc")}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("verify.doc_type")}</label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{docTypes.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Why do you want verification?</label>
                    <Textarea
                      placeholder="Describe why you're requesting verification (e.g. public figure, brand, journalist, notable individual...)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="rounded-xl resize-none text-sm"
                    />
                    <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("verify.upload")}</label>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:bg-accent/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{file ? file.name : t("verify.upload_hint")}</span>
                      <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} />
                    </label>
                    {preview && <img src={preview} alt="Preview" className="rounded-xl max-h-48 w-full object-contain border border-border" />}
                  </div>

                  <Button onClick={handleSubmit} disabled={submitting || !file || !reason.trim()} className="w-full rounded-full gap-2">
                    <BadgeCheck className="h-4 w-4" />{submitting ? t("support.submitting") : t("verify.submit")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
