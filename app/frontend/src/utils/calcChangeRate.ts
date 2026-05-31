import type { CityAnnualSummary, CityChangeRate } from "../types/landPrice";

export function calcCityChangeRates(
  summaries: CityAnnualSummary[],
  fromYear?: number,
  toYear?: number,
): CityChangeRate[] {
  const grouped = new Map<string, CityAnnualSummary[]>();
  for (const s of summaries) {
    const arr = grouped.get(s.city_code) ?? [];
    arr.push(s);
    grouped.set(s.city_code, arr);
  }

  const results: CityChangeRate[] = [];
  for (const [city_code, records] of grouped) {
    const sorted = records.sort((a, b) => a.year - b.year);

    let base: CityAnnualSummary | undefined;
    let compare: CityAnnualSummary | undefined;

    if (fromYear !== undefined && toYear !== undefined) {
      base = sorted.find(r => r.year === fromYear);
      compare = sorted.find(r => r.year === toYear);
    } else {
      compare = sorted[sorted.length - 1];
      base = sorted[sorted.length - 2];
    }

    if (!compare) continue;

    const changeRate =
      base && base.avg_price_per_sqm > 0
        ? ((compare.avg_price_per_sqm - base.avg_price_per_sqm) / base.avg_price_per_sqm) * 100
        : null;

    results.push({
      city_code,
      city_name: compare.city_name,
      prefecture_name: compare.prefecture_name,
      baseYear: base?.year ?? (fromYear ?? compare.year - 1),
      compareYear: compare.year,
      avgPricePerSqm: Math.round(compare.avg_price_per_sqm),
      changeRate: changeRate !== null ? Math.round(changeRate * 10) / 10 : null,
    });
  }

  return results.sort((a, b) => (b.changeRate ?? -Infinity) - (a.changeRate ?? -Infinity));
}
