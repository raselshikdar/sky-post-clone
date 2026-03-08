import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 py-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 text-foreground">
        <p className="text-sm text-muted-foreground">Last updated: March 8, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We collect information you provide directly, such as your name, email address, profile details, and content you post. We also collect usage data including device information, IP address, and interaction patterns to improve the Platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. How We Use Your Information</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">We use your information to:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
            <li>Provide, maintain, and improve the Platform</li>
            <li>Personalize your experience and content recommendations</li>
            <li>Communicate with you about updates and support</li>
            <li>Ensure safety and enforce our Terms of Service</li>
            <li>Analyze usage trends and improve performance</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Information Sharing</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We do not sell your personal information. We may share information with service providers who help us operate the Platform, when required by law, or to protect the rights and safety of our users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Public Content</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Posts, profile information, and other content you share publicly on Awaj are visible to other users and may be indexed by search engines. You can control the visibility of certain information through your privacy settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Data Security</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">6. Data Retention</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time through the Settings page.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">7. Your Rights</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">You have the right to:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
            <li>Access and receive a copy of your personal data</li>
            <li>Correct inaccurate or incomplete information</li>
            <li>Request deletion of your personal data</li>
            <li>Object to or restrict certain processing of your data</li>
            <li>Data portability where technically feasible</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">8. Cookies & Tracking</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use essential cookies to keep you logged in and maintain your preferences. We may use analytics tools to understand how the Platform is used. You can manage cookie preferences through your browser settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">9. Children's Privacy</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Awaj is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information promptly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">10. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Platform. Your continued use after changes constitutes acceptance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">11. Contact</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If you have questions or concerns about this Privacy Policy, please contact us through the Support page in the app.
          </p>
        </section>
      </div>
    </div>
  );
}
