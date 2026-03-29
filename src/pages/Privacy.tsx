import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly, such as your name, email address, and payment details when you create an account or subscribe to a plan. We also collect usage data automatically, including your IP address, device type, browser, and how you interact with our services. We do not collect or store your video footage — all AI processing happens locally on your machine.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use your information to provide and improve our services, process payments, send transactional emails (such as receipts and account notifications), and respond to your support requests. We do not sell your personal information to third parties.`,
  },
  {
    title: "3. Payments",
    content: `Payments are processed securely by Stripe. We do not store your full credit card details on our servers. Stripe's privacy policy governs the handling of your payment information.`,
  },
  {
    title: "4. Data Sharing",
    content: `We share your information only with service providers necessary to operate our services (e.g., Stripe for payments, Supabase for authentication and data storage, Resend for email). We do not share your data with advertisers or data brokers.`,
  },
  {
    title: "5. Data Retention",
    content: `We retain your account information for as long as your account is active. If you delete your account, we will delete or anonymize your personal data within 30 days, unless we are required to retain it by law.`,
  },
  {
    title: "6. Security",
    content: `We implement industry-standard security measures including encrypted connections (HTTPS), secure authentication, and access controls. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: "7. Your Rights",
    content: `You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also unsubscribe from marketing communications at any time. Depending on your jurisdiction, you may have additional rights under applicable privacy laws.`,
  },
  {
    title: "8. Children",
    content: `Our services are not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes by updating the date at the top of this page or by email. Continued use of our services after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: "10. Contact",
    content: `Questions about this policy? Reach us on X at @pro_zenvi or via the contact link in the footer.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-base font-bold text-white tracking-tight">Zenvi</Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-white transition-colors">← Back to site</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-muted-foreground mb-3">Last Updated: March 29, 2026</p>
        <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground mb-12 leading-relaxed">
          Zenvi, Inc. ("Zenvi", "we", "us", or "our") is committed to protecting your privacy. This policy explains how we collect, use, and share information about you when you use our services.
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-semibold text-white mb-3">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/[0.06] px-6 py-8 mt-16">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Zenvi, Inc. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
