"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { VehicleForm } from "@/components/site/vehicle-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/backend/auth-context";
import { api, ApiError } from "@/lib/backend/client";
import type { Booking, ProviderDetail, ServicePackage, Vehicle } from "@/lib/backend/types";

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function BookServicePage(props: { params: Promise<{ providerId: string; packageId: string }> }) {
  const { providerId, packageId } = use(props.params);
  const { user, loading: authLoading } = useAuth();

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState(formatDateInput(new Date()));
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsDate, setSlotsDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const slotsLoading = slotsDate !== date;
  // Whenever the date changes, the previously selected slot (from the old date's list)
  // is no longer valid — rather than resetting selectedSlot via an effect, we just treat
  // it as unselected until the user picks a new one from the freshly-loaded list.
  const effectiveSelectedSlot = slotsLoading ? null : selectedSlot;

  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  useEffect(() => {
    api
      .get<ProviderDetail>(`/api/v1/providers/${providerId}`)
      .then((detail) => {
        setProvider(detail);
        const found = detail.packages.find((p) => p.id === Number(packageId));
        if (!found) {
          setLoadError("That service is no longer available.");
        } else {
          setPkg(found);
        }
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load this service."));
  }, [providerId, packageId]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<string[]>(`/api/v1/providers/${providerId}/packages/${packageId}/available-slots?date=${date}`)
      .then((res) => {
        if (cancelled) return;
        setSlots(res);
        setSlotsDate(date);
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setSlotsDate(date);
      });
    return () => {
      cancelled = true;
    };
  }, [providerId, packageId, date]);

  useEffect(() => {
    if (!user) return;
    api
      .get<Vehicle[]>("/api/v1/vehicles")
      .then((res) => {
        setVehicles(res);
        const def = res.find((v) => v.is_default) || res[0];
        if (def) setVehicleId(def.id);
        if (res.length === 0) setShowAddVehicle(true);
      })
      .catch(() => setVehicles([]));
  }, [user]);

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!effectiveSelectedSlot || !vehicleId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await api.post<Booking>("/api/v1/bookings", {
        package_id: Number(packageId),
        vehicle_id: vehicleId,
        scheduled_at: effectiveSelectedSlot,
        notes: notes.trim() || undefined,
      });
      setConfirmed(booking);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't complete this booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <>
        <Header />
        <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Log in to book this service</h1>
          <p className="mt-2 text-muted-foreground">You&apos;ll need an account to reserve a slot and manage your booking.</p>
          <Link
            href={`/login?next=/book/${providerId}/${packageId}`}
            className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full")}
          >
            Log in or sign up
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  if (confirmed) {
    return (
      <>
        <Header />
        <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 text-center">
          <CheckCircle2 className="size-12 text-brand-green" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Booking requested</h1>
          <p className="mt-2 text-muted-foreground">
            {provider?.business_name} will confirm your {confirmed.package_name} appointment shortly. You can track
            its status anytime in My Bookings.
          </p>
          <Link href="/account/bookings" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full")}>
            View My Bookings
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-12">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : !provider || !pkg ? (
          <p className="text-sm text-muted-foreground">Loading service…</p>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{pkg.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {provider.business_name} · {provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="font-semibold text-foreground">₹{pkg.price.toFixed(0)}</span>
              <span className="text-muted-foreground">{pkg.duration_minutes} min</span>
            </div>

            <form onSubmit={handleConfirm} className="mt-8 flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">Choose a date</Label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  min={formatDateInput(new Date())}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div>
                <Label>Choose a time</Label>
                {slotsLoading || slots === null ? (
                  <p className="mt-2 text-sm text-muted-foreground">Loading available times…</p>
                ) : slots.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No slots open on this date — try another day.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slots.map((slot) => {
                      const label = new Date(slot).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                      const active = effectiveSelectedSlot === slot;
                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                            active
                              ? "border-brand-green bg-brand-green/15 text-brand-green"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label>Your vehicle</Label>
                {vehicles === null ? (
                  <p className="mt-2 text-sm text-muted-foreground">Loading your garage…</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-3">
                    {vehicles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {vehicles.map((v) => (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => setVehicleId(v.id)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                              vehicleId === v.id
                                ? "border-brand-green bg-brand-green/15 text-brand-green"
                                : "border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {v.brand} {v.model} · {v.registration_number}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {showAddVehicle ? (
                      <VehicleForm
                        onCreated={(v) => {
                          setVehicles((prev) => [...(prev || []), v]);
                          setVehicleId(v.id);
                          setShowAddVehicle(false);
                        }}
                        onCancel={vehicles && vehicles.length > 0 ? () => setShowAddVehicle(false) : undefined}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddVehicle(true)}
                        className="w-fit text-sm font-semibold text-brand-green hover:underline"
                      >
                        + Add another vehicle
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes for the provider (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="rounded-xl"
                  maxLength={1000}
                />
              </div>

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

              <button
                type="submit"
                disabled={submitting || !effectiveSelectedSlot || !vehicleId}
                className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm booking
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
