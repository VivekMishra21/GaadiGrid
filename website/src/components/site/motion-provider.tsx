"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";

/**
 * App-wide motion settings.
 *  - `reducedMotion="user"`: every Motion component drops transform animations (keeps opacity)
 *    when the visitor prefers reduced motion.
 *  - Route entrance: once the path differs from the one the page loaded on, we flag <html>, and
 *    CSS gives each newly mounted <main> a short fade + 10px rise. The very first load is never
 *    animated or delayed.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const initialPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== initialPath.current) document.documentElement.dataset.nav = "1";
  }, [pathname]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
