"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      city: String(formData.get("city") || ""),
      vehicleType: String(formData.get("vehicleType") || ""),
    };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/10 px-6 py-10 text-center"
      >
        <CheckCircle2 className="size-10 text-brand-green" />
        <h3 className="text-lg font-semibold text-foreground">You&apos;re on the list</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          We&apos;ll email you the moment GaadiGrid opens in your city. Thanks for driving with us
          early.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Your name" required maxLength={120} className="h-11 rounded-xl" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          maxLength={200}
          className="h-11 rounded-xl"
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-1">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" placeholder="e.g. Pune" maxLength={100} className="h-11 rounded-xl" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-1">
        <Label htmlFor="vehicleType">Vehicle type</Label>
        <Input
          id="vehicleType"
          name="vehicleType"
          placeholder="e.g. Car, Bike, CNG auto"
          maxLength={100}
          className="h-11 rounded-xl"
        />
      </div>

      {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}

      <Button type="submit" size="lg" loading={status === "submitting"} className="mt-1 rounded-full sm:col-span-2">
        Join the waitlist
      </Button>
    </form>
  );
}
