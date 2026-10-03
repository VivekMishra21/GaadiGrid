"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, User, X } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";
import { useAuth } from "@/lib/backend/auth-context";

const NAV_LINKS = [
  { href: "/find-fuel", label: "Find Fuel" },
  { href: "/car-wash", label: "Car Wash" },
  { href: "/vehicle-care", label: "Vehicle Care" },
  { href: "/partner", label: "Partner With Us" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Slightly more solid with a soft edge once the page has scrolled. Passive + one frame at a time.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-lg transition-[background-color,border-color,box-shadow] duration-200 ease-[var(--ease-premium)]",
        scrolled
          ? "border-border bg-background/95 shadow-[0_8px_24px_-18px_rgba(17,24,26,0.25)]"
          : "border-border/40 bg-background/70"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={user ? "/account/bookings" : "/login"}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <User className="size-4" />
            {user ? user.full_name.split(" ")[0] : "Login"}
          </Link>
          {user ? (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={handleLogout} leftIcon={<LogOut className="size-4" />}>
              Log out
            </Button>
          ) : (
            <ButtonLink href="/signup" variant="secondary" size="lg" className="rounded-full px-5">
              Sign up
            </ButtonLink>
          )}
          <ButtonLink href="/find-fuel" size="lg" className="rounded-full px-5">
            Explore Nearby
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full text-foreground lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden border-t border-border/60 lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={user ? "/account/bookings" : "/login"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <User className="size-4" />
                {user ? user.full_name.split(" ")[0] : "Login"}
              </Link>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              ) : (
                <ButtonLink href="/signup" onClick={() => setOpen(false)} variant="secondary" size="lg" fullWidth className="mt-2 rounded-full">
                  Sign up
                </ButtonLink>
              )}
              <ButtonLink href="/find-fuel" onClick={() => setOpen(false)} size="lg" fullWidth className="mt-2 rounded-full">
                Explore Nearby
              </ButtonLink>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
