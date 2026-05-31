import axios from "axios";
import type { CityAnnualSummary, DistrictAnnualSummary, LandPrice } from "../types/landPrice";

const client = axios.create({ baseURL: "/api/v1" });

export async function fetchLandPrices(params: {
  prefecture_code?: string;
  city_code?: string;
  year?: number;
  limit?: number;
  offset?: number;
}): Promise<LandPrice[]> {
  const { data } = await client.get<LandPrice[]>("/land-prices/", { params });
  return data;
}

export async function fetchCityAnnualSummary(params: {
  prefecture_code?: string;
  land_use?: string;
}): Promise<CityAnnualSummary[]> {
  const { data } = await client.get<CityAnnualSummary[]>(
    "/land-prices/summary/cities",
    { params }
  );
  return data;
}

export async function fetchLandUses(): Promise<string[]> {
  const { data } = await client.get<string[]>("/land-prices/land-uses");
  return data;
}

export async function fetchDistrictAnnualSummary(params: {
  city_code: string;
}): Promise<DistrictAnnualSummary[]> {
  const { data } = await client.get<DistrictAnnualSummary[]>(
    "/land-prices/summary/districts",
    { params }
  );
  return data;
}
