"use client";

import { useEffect, useState } from "react";

import { Reveal, RevealGroup } from "@/components/site/reveal";
import { LocationPicker, type PickedLocation } from "@/components/site/location-picker";
import { StationCard, StationCardSkeleton } from "@/components/site/station-card";
import { api } from "@/lib/backend/client";
import type { Paginated, StationSummary } from "@/lib/backend/types";
import { DEFAULT_NOIDA_CENTER } from "@/lib/noida-localities";
import { ButtonLink } from "@/components/ui/button";

export function NearbyPreview() {
  const [location, setLocation] = useState<PickedLocation>({
    label: DEFAULT_NOIDA_CENTER.label,
    latitude: DEFAULT_NOIDA_CENTER.latitude,
    longitude: DEFAULT_NOIDA_CENTER.longitude,
  });
  const [stations, setStations] = useState<StationSummary[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const requestKey = `${location.latitude},${location.longitude}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    api
      .get<Paginated<StationSummary>>(
        `/api/v1/stations?lat=${location.latitude}&lng=${location.longitude}&radius_km=15&page_size=4`
      )
      .then((res) => {
        if (cancelled) return;
        setStations(res.items);
        setLoadedKey(requestKey);
      })
      .catch(() => {
        if (cancelled) return;
        setStations([]);
        setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Where are you headed?</h2>
        <p className="mt-3 text-muted-foreground">
          Enter your location, or use where you are right now — we&apos;ll show real stations nearby.
        </p>
      </Reveal>

      <Reveal className="mx-auto mt-8 max-w-2xl">
        <LocationPicker onPick={setLocation} />
      </Reveal>

      <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading || stations === null
          ? Array.from({ length: 4 }).map((_, i) => <StationCardSkeleton key={i} />)
          : stations.map((s) => <StationCard key={s.id} station={s} />)}
      </RevealGroup>

      {!loading && stations !== null && stations.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No stations listed near {location.label} yet — try another sector.
        </p>
      ) : null}

      <div className="mt-8 text-center">
        <ButtonLink href="/find-fuel" variant="secondary" className="rounded-full">
          See all nearby stations
        </ButtonLink>
      </div>
    </section>
  );
}
