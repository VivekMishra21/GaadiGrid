import { api } from "./client";
import type { Paginated, ProviderDetail, ProviderSummary, ServicePackage } from "./types";

export interface CatalogueEntry {
  package: ServicePackage;
  provider: ProviderSummary;
}

/** Providers filtered by category, expanded into individual bookable service-package
 * cards. The backend's provider search matches "has at least one active package in
 * this category," so we still filter the returned packages client-side. */
export async function loadCatalogue(categories: string[], city = "Noida"): Promise<CatalogueEntry[]> {
  const seen = new Map<number, ProviderSummary>();
  for (const category of categories) {
    const res = await api.get<Paginated<ProviderSummary>>(
      `/api/v1/providers?city=${encodeURIComponent(city)}&category=${category}&page_size=50`
    );
    for (const p of res.items) seen.set(p.id, p);
  }

  const details = await Promise.all(
    Array.from(seen.values()).map((p) => api.get<ProviderDetail>(`/api/v1/providers/${p.id}`))
  );

  const entries: CatalogueEntry[] = [];
  for (const detail of details) {
    for (const pkg of detail.packages) {
      if (pkg.is_active && categories.includes(pkg.category)) {
        entries.push({ package: pkg, provider: detail });
      }
    }
  }
  return entries;
}
