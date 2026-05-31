export interface LandPrice {
  id: number;
  prefecture_code: string;
  prefecture_name: string;
  city_code: string;
  city_name: string;
  district_name: string | null;
  land_use: string | null;
  price_per_sqm: number;
  area_sqm: number | null;
  year: number;
  address: string | null;
  station_name: string | null;
  distance_to_station: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CityAnnualSummary {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  year: number;
  avg_price_per_sqm: number;
  min_price_per_sqm: number;
  max_price_per_sqm: number;
  record_count: number;
}

export interface CityChangeRate {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  baseYear: number;
  compareYear: number;
  avgPricePerSqm: number;
  changeRate: number | null;
}

export interface DistrictAnnualSummary {
  city_code: string;
  city_name: string;
  district_name: string;
  year: number;
  avg_price_per_sqm: number;
  min_price_per_sqm: number;
  max_price_per_sqm: number;
  record_count: number;
}

export interface DistrictChangeRate {
  city_code: string;
  city_name: string;
  district_name: string;
  baseYear: number;
  compareYear: number;
  avgPricePerSqm: number;
  changeRate: number | null;
}
