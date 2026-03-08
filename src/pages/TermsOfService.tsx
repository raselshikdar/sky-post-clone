import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-1.5">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Terms of Service</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 text-foreground">
        <p className="text-sm text-muted-foreground">Last updated: March 8, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            By accessing or using Awaj ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Eligibility</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You must be at least 13 years old to use the Platform. By using Awaj, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. User Accounts</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information during registration and to update such information as necessary. You are solely responsible for all activity that occurs under your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. User Content</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You retain ownership of content you post on Awaj. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content in connection with operating and providing the Platform. You are solely responsible for the content you post and must not post content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Prohibited Conduct</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">You agree not to:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Harass, bully, or intimidate other users</li>
            <li>Post spam, misleading, or deceptive content</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Use automated tools to scrape or collect data without permission</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">6. Moderation & Enforcement</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We reserve the right to remove content, suspend, or terminate accounts that violate these Terms at our sole discretion. We may also report illegal activity to the appropriate authorities.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">7. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Platform, including its design, logos, and software, is owned by Awaj and protected by intellectual property laws. You may not copy, modify, or distribute any part of the Platform without our prior written consent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">8. Disclaimer of Warranties</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Platform will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">9. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            To the maximum extent permitted by law, Awaj shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">10. Changes to Terms</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update these Terms from time to time. We will notify users of significant changes. Your continued use of the Platform after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">11. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If you have questions about these Terms, please contact us through the Support page in the app.
          </p>
        </section>
      </div>
    </div>
  );
}
