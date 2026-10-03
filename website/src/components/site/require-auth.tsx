"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/backend/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Log in to continue</h1>
        <p className="mt-2 text-muted-foreground">You&apos;ll need an account to see this page.</p>
        <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} size="lg" className="mt-6 rounded-full">
          Log in or sign up
        </ButtonLink>
      </div>
    );
  }

  return <>{children}</>;
}
