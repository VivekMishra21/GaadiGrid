"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/backend/client";
import { FUEL_TYPE_LABELS, FUEL_TYPES, VEHICLE_TYPE_LABELS, VEHICLE_TYPES, type Vehicle } from "@/lib/backend/types";

export function VehicleForm({ onCreated, onCancel }: { onCreated: (vehicle: Vehicle) => void; onCancel?: () => void }) {
  const [vehicleType, setVehicleType] = useState<string>("CAR");
  const [registration, setRegistration] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [fuelType, setFuelType] = useState<string>("PETROL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const vehicle = await api.post<Vehicle>("/api/v1/vehicles", {
        vehicle_type: vehicleType,
        registration_number: registration,
        brand,
        model,
        fuel_type: fuelType,
        is_default: true,
      });
      onCreated(vehicle);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that vehicle. Please check the details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">Add a vehicle</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vehicleType">Type</Label>
          <select
            id="vehicleType"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {VEHICLE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fuelType">Fuel</Label>
          <select
            id="fuelType"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {FUEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {FUEL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Maruti Suzuki" required className="h-10 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Model</Label>
          <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Swift" required className="h-10 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="registration">Registration number</Label>
        <Input
          id="registration"
          value={registration}
          onChange={(e) => setRegistration(e.target.value.toUpperCase())}
          placeholder="UP16AB1234"
          required
          className="h-10 rounded-lg"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className={cn(buttonVariants({ size: "default" }), "rounded-full")}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save vehicle
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={cn(buttonVariants({ variant: "ghost", size: "default" }), "rounded-full")}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
