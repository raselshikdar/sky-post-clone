import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Upload, BadgeCheck, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const docTypes = [
  { value: "nid", label: "National ID (NID)" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
];

export default function VerificationApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState("nid");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: existingRequest } = useQuery({
    queryKey: ["my_verification", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const { data: isVerified } = useQuery({
    queryKey: ["is_verified", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("verified_users").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) {
      toast.error("Only JPG, PNG, WebP or PDF allowed");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please upload a document");
      return;
    }
    setSubmitting(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, file);
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("verification_requests").insert({
      user_id: user!.id,
      document_type: docType,
      document_url: path,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Submission failed");
    } else {
      toast.success("Verification request submitted!");
      queryClient.invalidateQueries({ queryKey: ["my_verification"] });
      setFile(null);
      setPreview(null);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="h-5 w-5 text-yellow-500" />;
    if (s === "approved") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold">Verification</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isVerified ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <BadgeCheck className="h-12 w-12 text-primary" />
              <h3 className="text-lg font-bold">You're Verified!</h3>
              <p className="text-sm text-muted-foreground">Your account has a blue verification badge.</p>
            </div>
          ) : existingRequest?.status === "pending" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              {statusIcon("pending")}
              <h3 className="text-lg font-bold">Application Under Review</h3>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(existingRequest.created_at).toLocaleDateString()} · {docTypes.find(d => d.value === existingRequest.document_type)?.label}
              </p>
              <p className="text-xs text-muted-foreground">We'll notify you once reviewed.</p>
            </div>
          ) : (
            <>
              {existingRequest?.status === "rejected" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Previous application rejected</p>
                  </div>
                  {existingRequest.admin_notes && (
                    <p className="text-xs text-muted-foreground">{existingRequest.admin_notes}</p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Apply for Verification</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a government-issued ID to verify your identity. Accepted: NID, Driving License, or Passport.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {docTypes.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Document</label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{file ? file.name : "Click to upload (JPG, PNG, PDF, max 5MB)"}</span>
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} />
                </label>
                {preview && (
                  <img src={preview} alt="Preview" className="rounded-xl max-h-48 w-full object-contain border border-border" />
                )}
              </div>

              <Button onClick={handleSubmit} disabled={submitting || !file} className="w-full rounded-full gap-2">
                <BadgeCheck className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
