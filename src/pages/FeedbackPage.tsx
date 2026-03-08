import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/LanguageContext";

export default function FeedbackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [type, setType] = useState("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { value: "suggestion", label: "Suggestion" },
    { value: "bug", label: "Bug Report" },
    { value: "feature", label: "Feature Request" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        type: type === "suggestion" || type === "feature" ? "feedback" : type === "bug" ? "bug" : "other",
        subject: `[${feedbackTypes.find(f => f.value === type)?.label}] ${subject}`,
        message,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-1.5">
          <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Feedback</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Thank you!</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Your feedback has been submitted. We appreciate you helping us improve Awaj!
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); setType("suggestion"); }}>
              Send another
            </Button>
            <Button onClick={() => navigate(-1)}>Go back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-1.5">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Feedback</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        <p className="text-sm text-muted-foreground">
          Help us improve Awaj! Share suggestions, report bugs, or request new features.
        </p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {feedbackTypes.map(ft => (
                <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject</label>
          <Input
            placeholder="Brief summary of your feedback"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Details</label>
          <Textarea
            placeholder="Tell us more..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
        </div>

        <Button
          className="w-full"
          disabled={!subject.trim() || !message.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : <><Send className="h-4 w-4 mr-2" /> Submit Feedback</>}
        </Button>
      </div>
    </div>
  );
}
