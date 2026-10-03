import { Clock, Fuel, MapPin, Navigation } from "lucide-react";

import type { StationSummary } from "@/lib/backend/types";

function cheapest(station: StationSummary) {
  if (station.prices.length === 0) return null;
  return station.prices.reduce((min, p) => (p.price < min.price ? p : min), station.prices[0]);
}

export function StationCard({ station }: { station: StationSummary }) {
  const best = cheapest(station);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <div className="lift-card flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{station.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {station.locality ? `${station.locality}, ${station.city}` : station.city}
          </p>
        </div>
        {station.distance_km != null ? (
          <span className="shrink-0 rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green">
            {station.distance_km} km
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {station.prices.length > 0 ? (
          station.prices.map((p) => (
            <span
              key={p.fuel_type_code}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              {p.fuel_type_label} ₹{p.price.toFixed(2)}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No prices listed yet</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {station.is_24_hours ? "Open 24 hours" : station.opens_at && station.closes_at ? `${station.opens_at} – ${station.closes_at}` : "Hours not listed"}
      </div>

      {best ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Prices last updated {best.age_minutes < 60 ? `${best.age_minutes}m ago` : `${Math.round(best.age_minutes / 60)}h ago`}
        </p>
      ) : null}

      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green hover:underline"
      >
        <Navigation className="size-4" />
        Get directions
      </a>
    </div>
  );
}

export function StationCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function StationCardEmptyIcon() {
  return <Fuel className="size-8 text-muted-foreground" />;
}
