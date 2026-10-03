"use client";

import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";

import { NOIDA_LOCALITIES } from "@/lib/noida-localities";
import { Button } from "@/components/ui/button";

export interface PickedLocation {
  label: string;
  latitude: number;
  longitude: number;
}

export function LocationPicker({
  onPick,
  className,
}: {
  onPick: (location: PickedLocation) => void;
  className?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onPick({
          label: "Your current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Please allow location access, or pick an area below.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            defaultValue=""
            onChange={(e) => {
              const locality = NOIDA_LOCALITIES.find((l) => l.label === e.target.value);
              if (locality) onPick(locality);
            }}
            className="h-12 w-full appearance-none rounded-xl border border-input bg-card pr-4 pl-10 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Enter your location — pick a Noida sector
            </option>
            {NOIDA_LOCALITIES.map((l) => (
              <option key={l.label} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={useMyLocation}
          loading={locating}
          leftIcon={<LocateFixed className="size-4" />}
          className="shrink-0"
        >
          Use my location
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
