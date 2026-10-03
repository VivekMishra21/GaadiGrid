"use client";

import { useEffect, useState } from "react";
import { Car, Trash2 } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { GaadiGridLoader } from "@/components/site/loader";
import { RequireAuth } from "@/components/site/require-auth";
import { VehicleForm } from "@/components/site/vehicle-form";
import { api, ApiError } from "@/lib/backend/client";
import { FUEL_TYPE_LABELS, VEHICLE_TYPE_LABELS, type Vehicle } from "@/lib/backend/types";

function GarageList() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    api
      .get<Vehicle[]>("/api/v1/vehicles")
      .then(setVehicles)
      .catch((err) => {
        setVehicles([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load your garage.");
      });
  }

  useEffect(load, []);

  async function handleDelete(id: number) {
    if (!confirm("Remove this vehicle from your garage?")) return;
    try {
      await api.delete(`/api/v1/vehicles/${id}`);
      setVehicles((prev) => (prev || []).filter((v) => v.id !== id));
    } catch {
      // best-effort
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">My Garage</h1>
      <p className="mt-2 text-muted-foreground">Save your vehicles so booking a service only takes a couple of taps.</p>

      {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

      {vehicles === null ? (
        <GaadiGridLoader label="Loading your garage" />
      ) : (
        <div className="stagger-in mt-8 flex flex-col gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
                  <Car className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    {v.brand} {v.model} {v.variant ? `· ${v.variant}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {v.registration_number} · {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type} ·{" "}
                    {FUEL_TYPE_LABELS[v.fuel_type] || v.fuel_type}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(v.id)}
                aria-label={`Remove ${v.brand} ${v.model}`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {showAdd ? (
            <VehicleForm
              onCreated={(v) => {
                setVehicles((prev) => [...(prev || []), v]);
                setShowAdd(false);
              }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-fit text-sm font-semibold text-brand-green hover:underline"
            >
              + Add a vehicle
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default function MyGaragePage() {
  return (
    <>
      <Header />
      <RequireAuth>
        <GarageList />
      </RequireAuth>
      <Footer />
    </>
  );
}
