export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

export interface FuelPrice {
  fuel_type_code: string;
  fuel_type_label: string;
  unit: string;
  price: number;
  updated_at: string;
  age_minutes: number;
}

export interface QueueSignal {
  value: string | null;
  label: string | null;
  last_reported_minutes_ago: number | null;
  report_count: number;
  confidence: number;
}

export interface StationSummary {
  id: number;
  name: string;
  brand: string | null;
  address: string;
  city: string;
  locality: string | null;
  latitude: number;
  longitude: number;
  is_24_hours: boolean;
  opens_at: string | null;
  closes_at: string | null;
  distance_km: number | null;
  is_favorite: boolean;
  prices: FuelPrice[];
  queue_status: { queue: QueueSignal; cng: QueueSignal };
}

export interface ProviderSummary {
  id: number;
  business_name: string;
  description: string | null;
  address: string;
  city: string;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: string;
  is_active: boolean;
  is_sponsored: boolean;
  average_rating: number | null;
  review_count: number;
}

export interface ServicePackage {
  id: number;
  provider_id: number;
  category: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_doorstep: boolean;
  is_active: boolean;
}

export interface ProviderDetail extends ProviderSummary {
  phone: string;
  email: string;
  packages: ServicePackage[];
}

export interface User {
  id: number;
  role: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  is_active: boolean;
  phone_verified_at: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Vehicle {
  id: number;
  owner_id: number;
  vehicle_type: string;
  registration_number: string;
  brand: string;
  model: string;
  variant: string | null;
  fuel_type: string;
  average_mileage: number | null;
  is_default: boolean;
  insurance_expiry: string | null;
  puc_expiry: string | null;
  service_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  customer_id: number;
  provider_id: number;
  provider_name: string;
  package_id: number;
  package_name: string;
  vehicle_id: number;
  address_id: number | null;
  scheduled_at: string;
  duration_minutes: number;
  price_at_booking: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "IN_PROGRESS" | "COMPLETED";
  payment_status: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_by_role: string | null;
  created_at: string;
  confirmed_at: string | null;
  rejected_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export const SERVICE_CATEGORIES = {
  CAR_WASH: "CAR_WASH",
  DETAILING: "DETAILING",
  AC_SERVICE: "AC_SERVICE",
  DENTING_PAINTING: "DENTING_PAINTING",
  GENERAL_SERVICE: "GENERAL_SERVICE",
  TYRE_SERVICE: "TYRE_SERVICE",
  BATTERY_SERVICE: "BATTERY_SERVICE",
  OTHER: "OTHER",
} as const;

export const CAR_WASH_CATEGORIES: string[] = [SERVICE_CATEGORIES.CAR_WASH, SERVICE_CATEGORIES.DETAILING];
export const VEHICLE_CARE_CATEGORIES: string[] = [
  SERVICE_CATEGORIES.AC_SERVICE,
  SERVICE_CATEGORIES.DENTING_PAINTING,
  SERVICE_CATEGORIES.GENERAL_SERVICE,
  SERVICE_CATEGORIES.TYRE_SERVICE,
  SERVICE_CATEGORIES.BATTERY_SERVICE,
  SERVICE_CATEGORIES.OTHER,
];

export const CATEGORY_LABELS: Record<string, string> = {
  CAR_WASH: "Car Wash",
  DETAILING: "Detailing",
  AC_SERVICE: "AC Service",
  DENTING_PAINTING: "Denting & Painting",
  GENERAL_SERVICE: "General Service",
  TYRE_SERVICE: "Tyre Service",
  BATTERY_SERVICE: "Battery Service",
  OTHER: "Other",
};

export const VEHICLE_TYPES = ["CAR", "BIKE", "SCOOTER", "AUTO_RICKSHAW", "COMMERCIAL"] as const;
export const FUEL_TYPES = ["PETROL", "DIESEL", "CNG", "EV", "HYBRID"] as const;

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  CAR: "Car",
  BIKE: "Bike",
  SCOOTER: "Scooter",
  AUTO_RICKSHAW: "Auto Rickshaw",
  COMMERCIAL: "Commercial",
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  CNG: "CNG",
  EV: "EV",
  HYBRID: "Hybrid",
};
