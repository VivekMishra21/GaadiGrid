"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Scroll reveal for logical content groups (not individual lines of text).
 *
 * A block is "armed" only if it starts below the fold; when it scrolls into view it plays the
 * `reveal-up` animation once (fade + small rise + 0.98 → 1, see globals.css) and is never
 * touched again. Blocks already on screen at load are left alone, so nothing flashes, and
 * visitors who prefer reduced motion never get a hidden state at all.
 */
function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already visible

    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "in";
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}

/** One block (heading + copy, an image, a form…) that rises into place. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  /** seconds */
  delay?: number;
  /** pixels; keep it between 12 and 24 */
  y?: number;
}) {
  const ref = useRevealOnce<HTMLDivElement>();
  const style = { "--reveal-y": `${Math.min(24, Math.max(12, y))}px`, animationDelay: delay ? `${delay}s` : undefined } as CSSProperties;

  return (
    <div ref={ref} className={`reveal${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

/** A set of sibling cards that rise in one after another. Children stagger by 80ms. */
export function RevealGroup({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRevealOnce<HTMLDivElement>();

  return (
    <div ref={ref} id={id} className={`reveal-group${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
