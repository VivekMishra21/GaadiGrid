"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES = ["Fuel / CNG Station", "Car Wash", "Detailing", "Vehicle Care / Service Center", "Other"];

type Status = "idle" | "submitting" | "success" | "error";

export default function PartnerPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      businessName: String(data.get("businessName") || ""),
      contactName: String(data.get("contactName") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      businessType: String(data.get("businessType") || ""),
      city: String(data.get("city") || ""),
      message: String(data.get("message") || ""),
    };

    try {
      const res = await fetch("/api/partner-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) {
        setError(resData.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-16">
        <span className="text-sm font-semibold text-brand-green">Partner With Us</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Grow with GaadiGrid</h1>
        <p className="mt-4 text-muted-foreground text-balance">
          Run a fuel station, car wash, or vehicle care business in Noida? Tell us about it and
          our partnerships team will reach out about getting you listed.
        </p>

        {status === "success" ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/10 px-6 py-10 text-center">
            <CheckCircle2 className="size-10 text-brand-green" />
            <h2 className="text-lg font-semibold text-foreground">Thanks — we got it</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Our partnerships team will reach out to the contact details you shared.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" required maxLength={200} className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" name="contactName" required maxLength={120} className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" required maxLength={20} className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={200} className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue="Noida" required maxLength={100} className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="businessType">Business type</Label>
              <select
                id="businessType"
                name="businessType"
                required
                defaultValue=""
                className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Select one
                </option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="message">Tell us more (optional)</Label>
              <Textarea id="message" name="message" rows={4} maxLength={1000} className="rounded-xl" />
            </div>

            {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={status === "submitting"}
              className={cn(buttonVariants({ size: "lg" }), "mt-1 rounded-full sm:col-span-2")}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Become a Partner"
              )}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
