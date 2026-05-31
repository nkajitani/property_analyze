export interface CityPriceDivergence {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  year: number;
  avg_published_price: number;
  avg_transaction_price: number;
  divergence_rate: number; // 正 = 取引価格 > 公示地価（%）
  published_count: number;
  transaction_count: number;
}

export interface TownPriceDivergence {
  city_code: string;
  city_name: string;
  prefecture_name: string;
  district_name: string;
  year: number;
  avg_published_price: number;
  avg_transaction_price: number;
  divergence_rate: number;
  published_count: number;
  transaction_count: number;
}
