import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Upload, BadgeCheck, Clock, XCircle, CheckCircle2, Eye, FileText, ShieldCheck, AlertTriangle, Lock, Trash2, PauseCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";

type DocSlot = "front" | "back" | "single";

export default function VerificationApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [docType, setDocType] = useState<"nid" | "driving_license" | "passport">("nid");
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<{ front?: File; back?: File; single?: File }>({});
  const [previews, setPreviews] = useState<{ front?: string; back?: string; single?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const docTypes = [
    { value: "nid", label: t("verify.nid") },
    { value: "driving_license", label: t("verify.driving") },
    { value: "passport", label: t("verify.passport") },
  ];

  // Documents that require both front and back
  const requiresBothSides = docType === "nid" || docType === "driving_license";

  const { data: existingRequest } = useQuery({
    queryKey: ["my_verification", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("verification_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const { data: verifiedRow } = useQuery({
    queryKey: ["my_verified_row", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("verified_users").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isVerified = !!verifiedRow && !(verifiedRow as any).is_suspended;
  const isSuspended = !!verifiedRow && !!(verifiedRow as any).is_suspended;

  const handleFile = (slot: DocSlot) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) { toast.error("Only JPG, PNG, WebP or PDF allowed"); return; }
    setFiles((p) => ({ ...p, [slot]: f }));
    setPreviews((p) => ({ ...p, [slot]: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined }));
  };

  const removeFile = (slot: DocSlot) => {
    setFiles((p) => { const { [slot]: _, ...rest } = p; return rest; });
    setPreviews((p) => { const { [slot]: _, ...rest } = p; return rest; });
  };

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please describe why you want verification"); return; }
    if (!acknowledged) { toast.error("Please acknowledge the document policy"); return; }

    if (requiresBothSides) {
      if (!files.front || !files.back) { toast.error("Please upload both FRONT and BACK of your document"); return; }
    } else {
      if (!files.single) { toast.error(t("verify.upload")); return; }
    }

    setSubmitting(true);
    try {
      const uploads: { slot: string; file: File }[] = requiresBothSides
        ? [{ slot: "front", file: files.front! }, { slot: "back", file: files.back! }]
        : [{ slot: "single", file: files.single! }];

      const paths: string[] = [];
      const ts = Date.now();
      for (const u of uploads) {
        const ext = u.file.name.split(".").pop();
        const path = `${user!.id}/${ts}_${u.slot}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, u.file);
        if (uploadError) { toast.error("Upload failed: " + uploadError.message); setSubmitting(false); return; }
        paths.push(path);
      }

      // Store primary doc URL in document_url; if both sides, store JSON paths in admin_notes-style? Keep simple: store as comma-separated in document_url.
      const documentUrl = paths.join("|");

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user!.id,
        document_type: docType,
        document_url: documentUrl,
        reason: reason.trim(),
      });
      if (error) {
        toast.error("Submission failed");
      } else {
        toast.success(t("verify.submit"));
        queryClient.invalidateQueries({ queryKey: ["my_verification"] });
        setFiles({});
        setPreviews({});
        setReason("");
        setAcknowledged(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const requestReview = async () => {
    if (!user) return;
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      type: "verification_review",
      subject: "Verification badge review request",
      message: `User is requesting a review of their ${isSuspended ? "suspended" : "rejected"} verification.\n\nAdmin's reason: ${(verifiedRow as any)?.suspension_reason || existingRequest?.admin_notes || "N/A"}`,
    });
    if (error) toast.error("Could not submit review request");
    else toast.success("Review request sent. Our team will look into it.");
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
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{t("verify.title")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* SUSPENDED state — takes priority over verified */}
          {isSuspended && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <PauseCircle className="h-6 w-6 text-yellow-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-500">Verification paused</p>
                  <p className="text-xs text-muted-foreground">
                    Paused {(verifiedRow as any)?.suspended_at ? new Date((verifiedRow as any).suspended_at).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
              {(verifiedRow as any)?.suspension_reason && (
                <div className="rounded-lg bg-background/60 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Reason from our team</p>
                  <p className="text-sm text-muted-foreground">{(verifiedRow as any).suspension_reason}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={requestReview}>
                  Request review
                </Button>
                <Button size="sm" className="flex-1 rounded-full" onClick={() => { /* fall through to form below */ }}>
                  Re-apply below
                </Button>
              </div>
            </div>
          )}

          {isVerified ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <BadgeCheck className="h-12 w-12 text-primary" />
              <h3 className="text-lg font-bold">{t("verify.verified")}</h3>
              <p className="text-sm text-muted-foreground">{t("verify.verified_desc")}</p>
            </div>
          ) : (
            <>
              {/* Status card for existing request */}
              {existingRequest && !isSuspended && (
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

                  {existingRequest.status === "rejected" && (
                    <Button size="sm" variant="outline" className="w-full rounded-full" onClick={requestReview}>
                      Request a manual review
                    </Button>
                  )}

                  {hasActiveRequest && (
                    <p className="text-xs text-muted-foreground">{t("verify.notify")}</p>
                  )}
                </div>
              )}

              {/* Show form if no active request OR user is suspended (re-apply path) */}
              {(!hasActiveRequest || isSuspended) && (
                <>
                  <div className="rounded-xl border border-border p-4 space-y-1">
                    <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" /><h3 className="font-semibold">{t("verify.apply")}</h3></div>
                    <p className="text-xs text-muted-foreground">{t("verify.apply_desc")}</p>
                  </div>

                  {/* Strict document policy notice */}
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      <p className="text-xs font-bold text-foreground">Document policy — please read</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-outside pl-4">
                      <li><strong className="text-foreground">Only government-issued, currently valid documents</strong> are accepted (NID, Driving License, or Passport). Expired or unofficial IDs will be rejected.</li>
                      <li>Photo must be <strong className="text-foreground">clear, in colour, uncropped</strong>, and all four corners visible. No glare, blur, or covered fields.</li>
                      <li>For NID and Driving License you must upload <strong className="text-foreground">BOTH the front and back</strong> sides — single-sided submissions are rejected.</li>
                      <li>Name on the document must match the name on your profile.</li>
                      <li>Do not edit, mask or photoshop any field. Tampered documents result in a permanent ban.</li>
                    </ul>
                  </div>

                  {/* Privacy & security assurance */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-xs font-bold text-foreground">Your data is safe</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2"><Lock className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> Documents are stored in a <strong className="text-foreground">private, encrypted bucket</strong> only our verification team can access.</li>
                      <li className="flex items-start gap-2"><Trash2 className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> Files are <strong className="text-foreground">automatically deleted</strong> as soon as the review is completed (approved or rejected).</li>
                      <li className="flex items-start gap-2"><ShieldCheck className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> Your documents are <strong className="text-foreground">never shown publicly</strong>, never sold and never used for advertising.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("verify.doc_type")}</label>
                    <Select value={docType} onValueChange={(v) => { setDocType(v as any); setFiles({}); setPreviews({}); }}>
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

                  {/* Upload area — front/back if required */}
                  {requiresBothSides ? (
                    <div className="grid grid-cols-2 gap-3">
                      <UploadSlot label="Front side" required preview={previews.front} fileName={files.front?.name} onChange={handleFile("front")} onRemove={() => removeFile("front")} />
                      <UploadSlot label="Back side" required preview={previews.back} fileName={files.back?.name} onChange={handleFile("back")} onRemove={() => removeFile("back")} />
                    </div>
                  ) : (
                    <UploadSlot label={t("verify.upload")} required preview={previews.single} fileName={files.single?.name} onChange={handleFile("single")} onRemove={() => removeFile("single")} />
                  )}

                  {/* Acknowledgement checkbox */}
                  <label className="flex items-start gap-2 rounded-xl border border-border p-3 cursor-pointer hover:bg-accent/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                    />
                    <span className="text-xs text-muted-foreground">
                      I confirm the document is <strong className="text-foreground">government-issued, valid, unedited</strong>, and belongs to me. I understand documents will be auto-deleted after review and that submitting fake or tampered IDs may result in a permanent ban.
                    </span>
                  </label>

                  <Button onClick={handleSubmit} disabled={submitting || !acknowledged || !reason.trim()} className="w-full rounded-full gap-2">
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

function UploadSlot({
  label, required, preview, fileName, onChange, onRemove,
}: {
  label: string;
  required?: boolean;
  preview?: string;
  fileName?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      {preview ? (
        <div className="relative rounded-xl border border-border overflow-hidden">
          <img src={preview} alt={label} className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1 hover:bg-background"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border p-4 cursor-pointer hover:bg-accent/50 transition-colors h-32">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground text-center px-1 line-clamp-2">{fileName || "Tap to upload"}</span>
          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onChange} />
        </label>
      )}
    </div>
  );
}
