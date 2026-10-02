import Link from "next/link";
import { MapPin } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { ContactForm } from "@/components/site/contact-form";

const EXPLORE_LINKS = [
  { href: "/find-fuel", label: "Find Fuel & CNG" },
  { href: "/car-wash", label: "Car Wash" },
  { href: "/vehicle-care", label: "Vehicle Care" },
  { href: "/partner", label: "Partner With Us" },
];

const ACCOUNT_LINKS = [
  { href: "/account/bookings", label: "My Bookings" },
  { href: "/account/garage", label: "My Garage" },
  { href: "/login", label: "Login / Sign up" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About GaadiGrid" },
  { href: "/help", label: "Help & Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-[1.2fr_auto_auto_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Fuel. Clean. Care. Drive. GaadiGrid brings fuel and CNG discovery, car wash, and
            vehicle care together in one place.
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MapPin className="size-4 text-brand-green" />
            Now serving: Noida
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Explore</h3>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            {EXPLORE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Account</h3>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            {ACCOUNT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-semibold text-foreground">Company</h3>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            {COMPANY_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md">
          <h3 className="text-sm font-semibold text-foreground">Get in touch</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions about GaadiGrid or a booking? Send us a note.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>

      <div className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GaadiGrid. All rights reserved.
      </div>
    </footer>
  );
}
