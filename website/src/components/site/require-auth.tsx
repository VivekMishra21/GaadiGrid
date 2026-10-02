"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full")}>
          Log in or sign up
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
