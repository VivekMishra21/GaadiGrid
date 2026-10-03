import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * GaadiGrid's one button.
 *
 * Variants: primary (emerald, default CTA) · secondary · accent (orange, use sparingly) · dark ·
 * ghost · danger (destructive actions only) · link.
 * Sizes: sm 40px · md 48px · lg 52px · icon 48px square. Width is chosen per screen with
 * `fullWidth`; nothing screen-specific lives here.
 *
 * `buttonVariants` is exported so a link or custom element can wear the same styles, but
 * prefer <Button> / <ButtonLink> — they add loading, icons and the right semantics.
 * Colours come from the theme tokens in globals.css (--brand-green, --brand-orange,
 * --foreground, --destructive), never literal hex values.
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-xl border border-transparent font-sans leading-none",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-premium)]",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // press: a slight scale-down. Hover lift is added per solid variant below. No movement for reduced-motion users.
    "active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-brand-green text-white shadow-sm hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--brand-green),black_7%)] hover:shadow-md hover:shadow-brand-green/20 active:translate-y-0 active:bg-[color-mix(in_oklch,var(--brand-green),black_14%)]",
        secondary:
          "border-brand-green/60 bg-card text-brand-green hover:bg-brand-green/10 active:bg-brand-green/15",
        accent:
          "bg-brand-orange text-white shadow-sm hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--brand-orange),black_7%)] hover:shadow-md hover:shadow-brand-orange/20 active:translate-y-0 active:bg-[color-mix(in_oklch,var(--brand-orange),black_14%)]",
        dark: "bg-foreground text-white shadow-sm hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--foreground),white_14%)] hover:shadow-md active:translate-y-0 active:bg-[color-mix(in_oklch,var(--foreground),white_22%)]",
        ghost: "bg-transparent text-foreground hover:bg-muted active:bg-[color-mix(in_oklch,var(--muted),black_5%)]",
        danger:
          "bg-destructive text-white shadow-sm hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--destructive),black_8%)] hover:shadow-md active:translate-y-0 active:bg-[color-mix(in_oklch,var(--destructive),black_16%)]",
        link: "h-auto rounded-sm bg-transparent p-0 text-brand-green underline-offset-4 hover:underline active:opacity-80",
      },
      size: {
        sm: "h-10 px-4 text-sm font-semibold",
        md: "h-12 px-5 text-sm font-semibold",
        lg: "h-[52px] px-6 text-base font-bold",
        icon: "size-12 p-0 text-sm font-semibold",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

type ButtonStyleProps = VariantProps<typeof buttonVariants>;

type ButtonOwnProps = ButtonStyleProps & {
  /** Shows a spinner and blocks interaction without changing the button's size. */
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

type ButtonProps = ButtonOwnProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;

function ButtonContent({
  loading,
  leftIcon,
  rightIcon,
  children,
}: Pick<ButtonOwnProps, "loading" | "leftIcon" | "rightIcon"> & { children?: React.ReactNode }) {
  return (
    <>
      {/* The label stays in the layout (just hidden) while loading, so the button keeps its width. */}
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "invisible")}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <Loader2 className="size-4 animate-spin" />
        </span>
      ) : null}
    </>
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading = false, leftIcon, rightIcon, disabled, className, children, type = "button", ...props },
  ref
) {
  if (process.env.NODE_ENV !== "production" && size === "icon" && !props["aria-label"] && !props["aria-labelledby"]) {
    console.warn("<Button size=\"icon\"> needs an aria-label so screen readers can name it.");
  }
  const blocked = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      disabled={blocked}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      <ButtonContent loading={loading} leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonContent>
    </button>
  );
});

type ButtonLinkProps = ButtonStyleProps &
  Pick<ButtonOwnProps, "leftIcon" | "rightIcon"> &
  Omit<React.ComponentProps<typeof Link>, "className"> & { className?: string; disabled?: boolean };

/** Same look as <Button>, but a real link (navigation) — keeps correct link semantics. */
function ButtonLink({ variant, size, fullWidth, leftIcon, rightIcon, disabled, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link
      data-slot="button"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      <ButtonContent leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonContent>
    </Link>
  );
}

export { Button, ButtonLink, buttonVariants };
export type { ButtonProps };
