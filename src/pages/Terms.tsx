import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Zenvi ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. These terms apply to all users, including visitors, registered users, and subscribers.`,
  },
  {
    title: "2. Description of Service",
    content: `Zenvi is a desktop AI video editing application. The Service includes the Zenvi desktop application, our website at zenvi.pro, and any related services. All AI processing occurs locally on your device — your footage is never uploaded to our servers.`,
  },
  {
    title: "3. Accounts",
    content: `You must create an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate and complete information when creating your account. You must be at least 13 years old to use the Service.`,
  },
  {
    title: "4. Access Codes & Beta",
    content: `During the beta period, access to Zenvi requires a valid invite code. Access codes are personal, non-transferable, and may only be used once. Zenvi reserves the right to revoke access codes at any time.`,
  },
  {
    title: "5. Subscriptions & Payments",
    content: `Paid plans are billed in advance on a monthly or annual basis. Lifetime access is a one-time payment. All payments are processed by Stripe. Subscription fees are non-refundable except where required by law or as described in our refund policy. We reserve the right to change pricing with reasonable notice.`,
  },
  {
    title: "6. Cancellation",
    content: `You may cancel your subscription at any time through your account dashboard or by contacting us. Upon cancellation, your subscription will remain active until the end of the current billing period. Lifetime access is non-cancellable and non-refundable after purchase.`,
  },
  {
    title: "7. Acceptable Use",
    content: `You agree not to use the Service to create content that is illegal, harmful, defamatory, infringing, or otherwise objectionable. You may not reverse-engineer, decompile, or attempt to extract the source code of our software. You may not use the Service to violate any applicable law or regulation.`,
  },
  {
    title: "8. Intellectual Property",
    content: `Zenvi and its licensors own all rights in the Service, including all software, design, trademarks, and content provided by Zenvi. You retain ownership of all video content you create using the Service. By using the Service, you do not acquire any ownership rights in Zenvi's intellectual property.`,
  },
  {
    title: "9. Disclaimer of Warranties",
    content: `The Service is provided "as is" and "as available" without warranty of any kind. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. Your use of the Service is at your sole risk.`,
  },
  {
    title: "10. Limitation of Liability",
    content: `To the maximum extent permitted by law, Zenvi's total liability to you for any claim arising from or related to the Service shall not exceed the amount you paid to Zenvi in the twelve months preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages.`,
  },
  {
    title: "11. Changes to Terms",
    content: `We may update these Terms from time to time. We will notify you of material changes by email or by posting a notice on our website. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.`,
  },
  {
    title: "12. Governing Law",
    content: `These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Ontario, Canada.`,
  },
  {
    title: "13. Contact",
    content: `Questions about these Terms? Reach us on X at @pro_zenvi or via the contact link in the footer.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-base font-bold text-white tracking-tight">Zenvi</Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-white transition-colors">← Back to site</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-muted-foreground mb-3">Last Updated: March 29, 2026</p>
        <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground mb-12 leading-relaxed">
          Please read these Terms of Service carefully before using Zenvi. These terms govern your access to and use of our services.
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
