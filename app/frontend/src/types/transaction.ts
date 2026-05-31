export interface TransactionCityAnnualSummary {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  year: number;
  quarter: number | null;
  avg_price_per_sqm: number;
  min_price_per_sqm: number;
  max_price_per_sqm: number;
  avg_trade_price: number;
  record_count: number;
}
