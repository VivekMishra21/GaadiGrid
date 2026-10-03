"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, ApiError } from "@/lib/backend/auth-context";
import { AuthCard, AuthShell, CtaArrow, ctaClass, Field, inputClass } from "@/components/site/auth-hero";
import { isValidIndianMobile } from "@/components/site/auth-shared";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = nextParam || "/account/bookings";
  const signupHref = nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : "/signup";
  const { requestOtp, verifyOtp } = useAuth();

  const phoneId = useId();
  const otpId = useId();
  const nameId = useId();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      // A name is only sent when the backend said this number has no account yet.
      await verifyOtp(fullPhone, otp, needsName && fullName.trim() ? { fullName: fullName.trim() } : undefined);
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError && err.message.toLowerCase().includes("full_name")) {
        setNeedsName(true);
        setApiError("We couldn't find an account for this number. Add your name to create one.");
      } else {
        setApiError(err instanceof ApiError ? err.message : "Couldn't verify that code. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">Welcome Back</h1>
      <p className="mt-2 text-base text-muted-foreground">Log in with your mobile number. We&apos;ll send you a one-time code.</p>

      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} noValidate className="auth-stagger mt-8 flex flex-col gap-4">
          <Field id={phoneId} label="Mobile Number" icon={Phone} error={phoneError}>
            {(p) => (
              <>
                <input
                  {...p}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phoneDigits}
                  onChange={(e) => {
                    setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                    if (phoneError) setPhoneError(null);
                  }}
                  placeholder="Mobile Number"
                  className={cn(p.className, "pl-[5.25rem]")}
                />
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-base font-medium text-foreground">+91</span>
              </>
            )}
          </Field>

          {apiError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {apiError}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={submitting} className={ctaClass} rightIcon={CtaArrow}>
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} noValidate className="auth-stagger mt-8 flex flex-col gap-4">
          <p className="text-base text-muted-foreground">
            We sent a code to <span className="font-semibold text-foreground">+91 {phoneDigits}</span>.
          </p>

          {devOtp ? (
            <p className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-sm text-foreground">
              Dev mode — no SMS provider connected yet, so here&apos;s your code: <strong>{devOtp}</strong>
            </p>
          ) : null}

          <div>
            <label htmlFor={otpId} className="sr-only">
              One-time code
            </label>
            <input
              id={otpId}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className={cn(inputClass(), "text-center text-lg tracking-[0.4em] placeholder:tracking-normal")}
            />
          </div>

          {needsName ? (
            <Field id={nameId} label="Full Name" icon={User}>
              {(p) => (
                <input {...p} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" autoComplete="name" />
              )}
            </Field>
          ) : null}

          {apiError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {apiError}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={submitting} className={ctaClass}>
            {needsName ? "Verify & create account" : "Verify & continue"}
          </Button>

          <button
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
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-base text-muted-foreground">
        New to GaadiGrid?{" "}
        <Link href={signupHref} className="font-semibold text-brand-green underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export function LoginScreen() {
  return (
    <AuthShell variant="day">
      <LoginForm />
    </AuthShell>
  );
}
