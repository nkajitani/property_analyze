import type { CityPriceDivergence, TownPriceDivergence } from '@/types/divergence';

interface FetchDivergenceParams {
  prefecture_code?: string;
  city_code?: string;
  year_from?: number;
  year_to?: number;
  land_use?: string;
}

function buildQuery(params: FetchDivergenceParams): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) query.set(k, String(v));
  });
  return query.toString();
}

export async function fetchDivergence(
  params: FetchDivergenceParams
): Promise<CityPriceDivergence[]> {
  const res = await fetch(`/api/v1/divergence/cities?${buildQuery(params)}`);
  if (!res.ok) throw new Error(`divergence fetch failed: ${res.status}`);
  return res.json() as Promise<CityPriceDivergence[]>;
}

export async function fetchTownDivergence(
  params: FetchDivergenceParams
): Promise<TownPriceDivergence[]> {
  const res = await fetch(`/api/v1/divergence/towns?${buildQuery(params)}`);
  if (!res.ok) throw new Error(`town divergence fetch failed: ${res.status}`);
  return res.json() as Promise<TownPriceDivergence[]>;
}
