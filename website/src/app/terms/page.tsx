import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply to using the GaadiGrid marketing website.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="25 September 2026">
      <p>
        These terms apply to your use of this website (the GaadiGrid marketing site) — not the
        GaadiGrid mobile app, which has its own terms shown at sign-up.
      </p>

      <div>
        <h2>Using this site</h2>
        <p>
          This site is provided to share information about GaadiGrid and to let you join our
          waitlist or contact us. You agree to provide accurate information in any form on this
          site and not to misuse the site or its forms (for example, automated or bulk
          submissions).
        </p>
      </div>

      <div>
        <h2>No guarantee of availability</h2>
        <p>
          Joining the waitlist does not guarantee GaadiGrid will launch in your city by any
          particular date. We&apos;ll email you when it does.
        </p>
      </div>

      <div>
        <h2>Content</h2>
        <p>
          All GaadiGrid names, logos, and content on this site belong to GaadiGrid and may not be
          reused without permission.
        </p>
      </div>

      <div>
        <h2>Changes</h2>
        <p>
          We may update these terms as the site evolves. Continued use of the site after a change
          means you accept the updated terms.
        </p>
      </div>

      <div>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Reach us at{" "}
          <a href="mailto:hello@gaadigrid.com">hello@gaadigrid.com</a>.
        </p>
      </div>
    </LegalPage>
  );
}
