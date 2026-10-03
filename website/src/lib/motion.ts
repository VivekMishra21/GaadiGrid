"use client";

import { useSyncExternalStore } from "react";

/**
 * GaadiGrid motion tokens. Every animation on the site pulls its timing from here (or from the
 * matching CSS variables in globals.css), so the whole product moves with one voice:
 * quick start, long soft landing, short distances. Transform + opacity only.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

export const DURATION = {
  /** hover / press feedback */
  fast: 0.2,
  /** text, cards, CTAs */
  base: 0.5,
  /** larger groups */
  slow: 0.7,
  /** the hero vehicle */
  car: 0.85,
} as const;

/** pixels */
export const DISTANCE = { sm: 12, md: 20 } as const;

/** seconds between siblings */
export const STAGGER = { tight: 0.05, base: 0.08 } as const;

/** Standard "fade and rise" used for text blocks and CTAs. */
export function fadeUp(delay = 0, y: number = DISTANCE.sm, duration: number = DURATION.base) {
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration, ease: EASE, delay },
  } as const;
}

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}

/** True from Tailwind's `lg` (1024px) up. Used to keep heavier effects off phones and tablets. */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe("(min-width: 1024px)"),
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  );
}
