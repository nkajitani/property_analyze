/**
 * FE-CALC-01〜11: utils/calcChangeRate.ts
 */
import { describe, it, expect } from "bun:test";
import { calcCityChangeRates } from "../../utils/calcChangeRate";
import type { CityAnnualSummary } from "../../types/landPrice";

function makeSummary(
  city_code: string,
  year: number,
  avg: number,
  city_name = "テスト市",
  prefecture_name = "東京都"
): CityAnnualSummary {
  return {
    city_code,
    city_name,
    prefecture_name,
    year,
    avg_price_per_sqm: avg,
    min_price_per_sqm: avg,
    max_price_per_sqm: avg,
    record_count: 1,
  };
}

describe("calcCityChangeRates", () => {
  // FE-CALC-01
  it("FE-CALC-01: 空配列 → []", () => {
    expect(calcCityChangeRates([])).toEqual([]);
  });

  // FE-CALC-02
  it("FE-CALC-02: 1 都市・1 年（前年データなし）→ changeRate: null", () => {
    const result = calcCityChangeRates([makeSummary("13101", 2024, 100)]);
    expect(result[0].changeRate).toBeNull();
  });

  // FE-CALC-03
  it("FE-CALC-03: 正変化率 → +20.0", () => {
    const result = calcCityChangeRates([
      makeSummary("13101", 2023, 100),
      makeSummary("13101", 2024, 120),
    ]);
    expect(result[0].changeRate).toBe(20.0);
  });

  // FE-CALC-04
  it("FE-CALC-04: 負変化率 → -20.0", () => {
    const result = calcCityChangeRates([
      makeSummary("13101", 2023, 100),
      makeSummary("13101", 2024, 80),
    ]);
    expect(result[0].changeRate).toBe(-20.0);
  });

  // FE-CALC-05
  it("FE-CALC-05: 変化率の丸め → 10.2", () => {
    const result = calcCityChangeRates([
      makeSummary("13101", 2023, 100),
      makeSummary("13101", 2024, 110.23),
    ]);
    expect(result[0].changeRate).toBe(10.2);
  });

  // FE-CALC-06
  it("FE-CALC-06: 複数都市を個別に計算", () => {
    const input = [
      makeSummary("13101", 2023, 100),
      makeSummary("13101", 2024, 110),
      makeSummary("13102", 2023, 200),
      makeSummary("13102", 2024, 180),
    ];
    const result = calcCityChangeRates(input);
    const c1 = result.find((r) => r.city_code === "13101");
    const c2 = result.find((r) => r.city_code === "13102");
    expect(c1?.changeRate).toBe(10.0);
    expect(c2?.changeRate).toBe(-10.0);
  });

  // FE-CALC-07
  it("FE-CALC-07: 降順ソート（changeRate 降順）", () => {
    const input = [
      makeSummary("A", 2023, 100),
      makeSummary("A", 2024, 110),  // +10
      makeSummary("B", 2023, 100),
      makeSummary("B", 2024, 105),  // +5
      makeSummary("C", 2023, 100),
      makeSummary("C", 2024, 97),   // -3
    ];
    const result = calcCityChangeRates(input);
    const rates = result.map((r) => r.changeRate);
    expect(rates[0]).toBe(10.0);
    expect(rates[1]).toBe(5.0);
    expect(rates[2]).toBe(-3.0);
  });

  // FE-CALC-08
  it("FE-CALC-08: changeRate: null は末尾に配置", () => {
    const input = [
      makeSummary("A", 2023, 100),
      makeSummary("A", 2024, 110),  // +10
      makeSummary("B", 2024, 100),  // null (前年なし)
    ];
    const result = calcCityChangeRates(input);
    const lastItem = result[result.length - 1];
    expect(lastItem.changeRate).toBeNull();
  });

  // FE-CALC-09
  it("FE-CALC-09: 3 年以上ある場合に最新 2 年を使用", () => {
    const input = [
      makeSummary("13101", 2022, 100),
      makeSummary("13101", 2023, 150),
      makeSummary("13101", 2024, 180),
    ];
    const result = calcCityChangeRates(input);
    // (180 - 150) / 150 * 100 = 20.0
    expect(result[0].changeRate).toBe(20.0);
  });

  // FE-CALC-10
  it("FE-CALC-10: 年度が逆順で渡されても正しく計算", () => {
    const input = [
      makeSummary("13101", 2024, 120),
      makeSummary("13101", 2023, 100),
    ];
    const result = calcCityChangeRates(input);
    expect(result[0].changeRate).toBe(20.0);
  });

  // FE-CALC-11
  it("FE-CALC-11: compareYear が最新年", () => {
    const input = [
      makeSummary("13101", 2022, 100),
      makeSummary("13101", 2023, 110),
      makeSummary("13101", 2024, 120),
    ];
    const result = calcCityChangeRates(input);
    expect(result[0].compareYear).toBe(2024);
  });
});
