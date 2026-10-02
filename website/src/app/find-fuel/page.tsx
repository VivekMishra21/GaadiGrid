"use client";

import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { LocationPicker, type PickedLocation } from "@/components/site/location-picker";
import { StationCard, StationCardSkeleton } from "@/components/site/station-card";
import { api, ApiError } from "@/lib/backend/client";
import type { Paginated, StationSummary } from "@/lib/backend/types";
import { DEFAULT_NOIDA_CENTER } from "@/lib/noida-localities";
import { cn } from "@/lib/utils";

const FUEL_FILTERS = [
  { value: "", label: "All fuels" },
  { value: "PETROL", label: "Petrol" },
  { value: "DIESEL", label: "Diesel" },
  { value: "CNG", label: "CNG" },
  { value: "EV", label: "EV" },
];

export default function FindFuelPage() {
  const [location, setLocation] = useState<PickedLocation>({
    label: DEFAULT_NOIDA_CENTER.label,
    latitude: DEFAULT_NOIDA_CENTER.latitude,
    longitude: DEFAULT_NOIDA_CENTER.longitude,
  });
  const [fuelType, setFuelType] = useState("");
  const [stations, setStations] = useState<StationSummary[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestKey = `${location.latitude},${location.longitude},${fuelType}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      lat: String(location.latitude),
      lng: String(location.longitude),
      radius_km: "15",
      page_size: "20",
    });
    if (fuelType) params.set("fuel_type", fuelType);

    api
      .get<Paginated<StationSummary>>(`/api/v1/stations?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setStations(res.items);
        setError(null);
        setLoadedKey(requestKey);
      })
      .catch((err) => {
        if (cancelled) return;
        setStations([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load stations right now.");
        setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, fuelType]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Find Fuel &amp; CNG</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Live-listed petrol, diesel, CNG and EV stations around Noida — with prices and a
          timestamp on every reading, so you know exactly how fresh it is.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <LocationPicker onPick={setLocation} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Fuel type:</span>
            {FUEL_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFuelType(f.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  fuelType === f.value
                    ? "border-brand-green bg-brand-green/15 text-brand-green"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Showing results near {location.label}.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading || stations === null
            ? Array.from({ length: 6 }).map((_, i) => <StationCardSkeleton key={i} />)
            : stations.map((s) => <StationCard key={s.id} station={s} />)}
        </div>

        {!loading && stations !== null && stations.length === 0 && !error ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No stations listed near {location.label} yet — try another sector.
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
      </main>
      <Footer />
    </>
  );
}
