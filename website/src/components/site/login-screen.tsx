"use client";

import { Suspense, useId, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, ApiError } from "@/lib/backend/auth-context";

// Scopes the shadcn/Tailwind theme tokens this card's descendants read (bg-background,
// text-foreground, border-input, ...) to a warm-light palette, without touching the
// rest of this permanently-dark site — see globals.css for the tokens being shadowed.
const LIGHT_PANEL_VARS: CSSProperties = {
  "--background": "#f8faf9",
  "--foreground": "#102a43",
  "--card": "#ffffff",
  "--card-foreground": "#102a43",
  "--popover": "#ffffff",
  "--popover-foreground": "#102a43",
  "--muted": "#eef2f1",
  "--muted-foreground": "#5b6b78",
  "--border": "#e2e8e6",
  "--input": "#dde5e2",
  "--ring": "#18a875",
} as CSSProperties;

const container = {
  hidden: { opacity: 0, scale: 0.97, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const, staggerChildren: 0.1, delayChildren: 0.15 },
  },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function isValidIndianMobile(digits: string) {
  return /^[6-9]\d{9}$/.test(digits);
}

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account/bookings";
  const { requestOtp, verifyOtp } = useAuth();
  const otpFieldId = useId();
  const nameFieldId = useId();
  const phoneFieldId = useId();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);

  const fullPhone = `+91${phoneDigits}`;

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!isValidIndianMobile(phoneDigits)) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneError(null);
    setApiError(null);
    setSubmitting(true);
    try {
      const res = await requestOtp(fullPhone);
      setDevOtp(res.dev_otp);
      setStep("otp");
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Couldn't send the OTP. Please check the number and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setApiError(null);
    setSubmitting(true);
    try {
      await verifyOtp(fullPhone, otp, fullName.trim() ? { fullName: fullName.trim() } : undefined);
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError && err.message.toLowerCase().includes("full_name")) {
        setNeedsName(true);
        setApiError("Looks like this is your first time — add your name to create an account.");
      } else {
        setApiError(err instanceof ApiError ? err.message : "Couldn't verify that code. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={LIGHT_PANEL_VARS}
      className="relative w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-2xl shadow-black/10 sm:p-9"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklch, var(--brand-green), transparent 82%)" }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div variants={item}>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome to GaadiGrid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in or create your account with a one-time code.
        </p>
      </motion.div>

      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} noValidate className="mt-7 flex flex-col gap-4">
          <motion.div variants={item} className="flex flex-col gap-1.5">
            <Label htmlFor={phoneFieldId} className="text-foreground">
              Mobile number
            </Label>
            <div
              className={cn(
                "flex items-stretch overflow-hidden rounded-xl border bg-transparent transition-colors focus-within:ring-3 focus-within:ring-ring/50",
                phoneError ? "border-destructive" : "border-input"
              )}
            >
              <span className="flex select-none items-center border-r border-input bg-muted px-3 text-sm font-semibold text-muted-foreground">
                +91
              </span>
              <input
                id={phoneFieldId}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                required
                value={phoneDigits}
                onChange={(e) => {
                  setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                  if (phoneError) setPhoneError(null);
                }}
                placeholder="98765 43210"
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? `${phoneFieldId}-error` : undefined}
                className="h-12 flex-1 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {phoneError ? (
              <p id={`${phoneFieldId}-error`} className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {phoneError}
              </p>
            ) : null}
          </motion.div>

          {apiError ? (
            <motion.p variants={item} className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {apiError}
            </motion.p>
          ) : null}

          <motion.button
            variants={item}
            type="submit"
            disabled={submitting}
            whileHover={submitting ? undefined : { scale: 1.01 }}
            whileTap={submitting ? undefined : { scale: 0.99 }}
            className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Send OTP
          </motion.button>
        </form>
      ) : (
        <form onSubmit={handleVerify} noValidate className="mt-7 flex flex-col gap-4">
          <motion.p variants={item} className="text-sm text-muted-foreground">
            Code sent to <span className="font-semibold text-foreground">+91 {phoneDigits}</span>.
          </motion.p>

          {devOtp ? (
            <motion.p
              variants={item}
              className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-sm text-foreground"
            >
              Dev mode — no SMS provider connected yet, so here&apos;s your code: <strong>{devOtp}</strong>
            </motion.p>
          ) : null}

          <motion.div variants={item} className="flex flex-col gap-1.5">
            <Label htmlFor={otpFieldId} className="text-foreground">
              One-time code
            </Label>
            <Input
              id={otpFieldId}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-12 rounded-xl border-input bg-transparent text-base tracking-[0.3em] text-foreground"
            />
          </motion.div>

          {needsName ? (
            <motion.div variants={item} className="flex flex-col gap-1.5">
              <Label htmlFor={nameFieldId} className="text-foreground">
                Your name
              </Label>
              <Input
                id={nameFieldId}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                autoComplete="name"
                className="h-12 rounded-xl border-input bg-transparent text-base text-foreground"
              />
            </motion.div>
          ) : null}

          {apiError ? (
            <motion.p variants={item} className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {apiError}
            </motion.p>
          ) : null}

          <motion.button
            variants={item}
            type="submit"
            disabled={submitting}
            whileHover={submitting ? undefined : { scale: 1.01 }}
            whileTap={submitting ? undefined : { scale: 0.99 }}
            className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {needsName ? "Create account" : "Verify & continue"}
          </motion.button>

          <motion.button
            variants={item}
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setApiError(null);
              setNeedsName(false);
            }}
            className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Use a different number
          </motion.button>
        </form>
      )}

      <motion.p variants={item} className="mt-7 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-green" />
        <span>
          By continuing you agree to GaadiGrid&apos;s{" "}
          <Link href="/terms" className="font-medium text-foreground underline-offset-2 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-foreground underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </motion.p>
    </motion.div>
  );
}

export function LoginScreen() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="relative flex flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row">
        {/* Visual panel — edge to edge, no letterbox gaps. The source photo is a
            forgiving 4:3 landscape shot with the SUV sitting right-of-centre and
            clear margin on both sides, so a single object-cover layer at object-
            position 80% (verified against panel heights from ~650px up to ~1200px)
            keeps the whole car in frame without needing the blur-backdrop trick the
            portrait night shot required. */}
        <div className="relative h-64 w-full shrink-0 overflow-hidden bg-[#0b1a2e] sm:h-80 lg:h-auto lg:w-[55%]">
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <Image
              src="/images/gaadigrid-login-sunlight.png"
              alt="A GaadiGrid-mapped SUV at a sunlit fuel station, with a car wash bay in the background"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-[80%_center]"
            />
          </motion.div>

          {/* Localised vignette behind the text only — the rest of the bright daytime
              photo stays untouched, per the "subtle overlay only where needed" brief. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 85% 65% at 0% 100%, rgba(16,42,67,0.88) 0%, rgba(16,42,67,0.5) 38%, transparent 72%)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
            className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14"
          >
            <h2 className="max-w-sm text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-5xl">
              Every drive starts here.
            </h2>
            <p className="mt-3 text-sm font-semibold text-white/85 sm:text-base">Fuel. Clean. Care. Drive.</p>
          </motion.div>
        </div>

        {/* Form panel — warm-light card on a warm-light background, ~45% width on desktop. */}
        <div
          style={LIGHT_PANEL_VARS}
          className="flex w-full flex-1 items-center justify-center bg-background px-5 py-10 sm:py-14 lg:w-[45%] lg:px-12"
        >
          <Suspense fallback={null}>
            <LoginCard />
          </Suspense>
        </div>
      </section>
    </MotionConfig>
  );
}
