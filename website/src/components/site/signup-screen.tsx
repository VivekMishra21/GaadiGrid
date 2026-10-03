"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Mail, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, ApiError } from "@/lib/backend/auth-context";
import { AuthCard, AuthShell, CtaArrow, ctaClass, Field, inputClass } from "@/components/site/auth-hero";
import { isValidEmail, isValidIndianMobile } from "@/components/site/auth-shared";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = nextParam || "/account/bookings";
  const loginHref = nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login";
  const { requestOtp, verifyOtp } = useAuth();

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const otpId = useId();
  const consentId = useId();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; consent?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullPhone = `+91${phoneDigits}`;
  const clear = (key: keyof typeof errors) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  async function handleDetails(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const found: typeof errors = {};
    if (fullName.trim().length < 2) found.name = "Enter your full name.";
    if (!isValidEmail(email)) found.email = "Enter a valid email address.";
    if (!isValidIndianMobile(phoneDigits)) found.phone = "Enter a valid 10-digit mobile number.";
    if (!agreed) found.consent = "Please accept the Terms of Service and Privacy Policy to continue.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setApiError(null);
    setSubmitting(true);
    try {
      const res = await requestOtp(fullPhone);
      setDevOtp(res.dev_otp);
      setStep("otp");
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Couldn't send the OTP. Please check your number and try again.");
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
      await verifyOtp(fullPhone, otp, { fullName: fullName.trim(), email: email.trim() });
      router.push(next);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Couldn't verify that code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">Create Your Account</h1>
      <p className="mt-2 text-base text-muted-foreground">Join GaadiGrid and get started in minutes.</p>

      {step === "details" ? (
        <form onSubmit={handleDetails} noValidate className="auth-stagger mt-8 flex flex-col gap-4">
          <Field id={nameId} label="Full Name" icon={User} error={errors.name}>
            {(p) => (
              <input
                {...p}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clear("name");
                }}
                placeholder="Full Name"
                autoComplete="name"
              />
            )}
          </Field>

          <Field id={emailId} label="Email Address" icon={Mail} error={errors.email}>
            {(p) => (
              <input
                {...p}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clear("email");
                }}
                placeholder="Email Address"
                autoComplete="email"
              />
            )}
          </Field>

          <Field id={phoneId} label="Mobile Number" icon={Phone} error={errors.phone}>
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
                    clear("phone");
                  }}
                  placeholder="Mobile Number"
                  className={cn(p.className, "pl-[5.25rem]")}
                />
                <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-base font-medium text-foreground">+91</span>
              </>
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
              <input
                id={consentId}
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  clear("consent");
                }}
                aria-invalid={!!errors.consent}
                className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-[var(--brand-green)]"
              />
              <span>
                I agree to GaadiGrid&apos;s{" "}
                <Link href="/terms" target="_blank" className="font-medium text-foreground underline-offset-2 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-foreground underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.consent ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {errors.consent}
              </p>
            ) : null}
          </div>

          {apiError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {apiError}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={submitting} className={ctaClass} rightIcon={CtaArrow}>
            Get Started
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} noValidate className="auth-stagger mt-8 flex flex-col gap-4">
          <p className="text-base text-muted-foreground">
            We sent a code to <span className="font-semibold text-foreground">+91 {phoneDigits}</span>. Enter it to create your account.
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

          {apiError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {apiError}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={submitting} className={ctaClass}>
            Verify &amp; create account
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("details");
              setOtp("");
              setApiError(null);
            }}
            className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Change my details
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-base text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-brand-green underline-offset-2 hover:underline">
          Log In
        </Link>
      </p>
    </AuthCard>
  );
}

export function SignupScreen() {
  return (
    <AuthShell
      variant="day"
      photo={{
        src: "/images/gaadigrid-signup-day.jpg",
        alt: "A young GaadiGrid driver leaning on his white SUV outside a modern home, checking the app on his phone, with fuel, car wash, vehicle care, bookings, garage, expenses and reminders connected around the car",
      }}
    >
      <SignupForm />
    </AuthShell>
  );
}
