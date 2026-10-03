"use client";

import { useEffect, useState } from "react";
import { CalendarClock, PackageOpen } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { GaadiGridLoader } from "@/components/site/loader";
import { RequireAuth } from "@/components/site/require-auth";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/backend/client";
import type { Booking, Paginated } from "@/lib/backend/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-brand-orange/15 text-brand-orange",
  CONFIRMED: "bg-brand-green/15 text-brand-green",
  IN_PROGRESS: "bg-brand-green/15 text-brand-green",
  COMPLETED: "bg-muted text-muted-foreground",
  REJECTED: "bg-destructive/15 text-destructive",
  CANCELLED: "bg-destructive/15 text-destructive",
};

function BookingsList() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  function load() {
    api
      .get<Paginated<Booking>>("/api/v1/bookings/mine?page_size=50")
      .then((res) => setBookings(res.items))
      .catch((err) => {
        setBookings([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load your bookings.");
      });
  }

  useEffect(load, []);

  async function handleCancel(id: number) {
    setCancellingId(id);
    try {
      await api.post(`/api/v1/bookings/${id}/cancel`, { reason: "Cancelled by customer" });
      load();
    } catch {
      // best-effort; the list simply won't update
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">My Bookings</h1>
      <p className="mt-2 text-muted-foreground">Your appointment status, history and cancellations.</p>

      {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

      {bookings === null ? (
        <GaadiGridLoader label="Loading your bookings" />
      ) : bookings.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageOpen className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
          <ButtonLink href="/car-wash" className="mt-2 rounded-full">
            Book a service
          </ButtonLink>
        </div>
      ) : (
        <div className="stagger-in mt-8 flex flex-col gap-4">
          {bookings.map((b) => {
            const canCancel = !["COMPLETED", "REJECTED", "CANCELLED"].includes(b.status);
            return (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{b.package_name}</h3>
                    <p className="text-sm text-muted-foreground">{b.provider_name}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[b.status])}>
                    {b.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarClock className="size-4" />
                  {new Date(b.scheduled_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-foreground">₹{b.price_at_booking.toFixed(0)}</span>
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="text-sm font-semibold text-destructive hover:underline disabled:opacity-50"
                    >
                      {cancellingId === b.id ? "Cancelling…" : "Cancel booking"}
                    </button>
                  ) : null}
                </div>
                {b.cancellation_reason ? (
                  <p className="mt-2 text-xs text-muted-foreground">Reason: {b.cancellation_reason}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function MyBookingsPage() {
  return (
    <>
      <Header />
      <RequireAuth>
        <BookingsList />
      </RequireAuth>
      <Footer />
    </>
  );
}
