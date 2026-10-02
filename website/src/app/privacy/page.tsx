import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How GaadiGrid collects and uses the information you share with this website.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="25 September 2026">
      <p>
        This page covers the GaadiGrid marketing website only — the forms on this site, and what
        we do with the information you submit through them.
      </p>

      <div>
        <h2>What we collect</h2>
        <p>When you join the waitlist, we store:</p>
        <ul>
          <li>Your name and email address</li>
          <li>Your city and vehicle type, if you choose to share them</li>
        </ul>
        <p>When you send us a message through the contact form, we store your name, email, subject, and message.</p>
      </div>

      <div>
        <h2>How we use it</h2>
        <p>
          Waitlist details are used only to notify you when GaadiGrid launches in your area, and
          to help us prioritize which cities to launch in next. Contact messages are used only to
          respond to your enquiry. We do not sell or share this information with third parties.
        </p>
      </div>

      <div>
        <h2>How long we keep it</h2>
        <p>
          Waitlist entries are kept until GaadiGrid launches in your city or you ask us to remove
          them. Contact messages are kept only as long as needed to resolve your enquiry.
        </p>
      </div>

      <div>
        <h2>Your choices</h2>
        <p>
          You can ask us to remove your waitlist entry or contact message at any time by emailing{" "}
          <a href="mailto:hello@gaadigrid.com">hello@gaadigrid.com</a>.
        </p>
      </div>

      <div>
        <h2>The GaadiGrid app</h2>
        <p>
          If you use the GaadiGrid mobile app, its privacy practices (location, bookings, payment
          information) are covered separately in the app&apos;s own privacy policy, shown during
          sign-up.
        </p>
      </div>
    </LegalPage>
  );
}
