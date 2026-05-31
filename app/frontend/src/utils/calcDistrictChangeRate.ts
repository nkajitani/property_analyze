import type { DistrictAnnualSummary, DistrictChangeRate } from "../types/landPrice";

export function calcDistrictChangeRates(
  summaries: DistrictAnnualSummary[],
  fromYear?: number,
  toYear?: number,
): DistrictChangeRate[] {
  const grouped = new Map<string, DistrictAnnualSummary[]>();
  for (const s of summaries) {
    const key = `${s.city_code}__${s.district_name}`;
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }

  const results: DistrictChangeRate[] = [];
  for (const records of grouped.values()) {
    const sorted = records.sort((a, b) => a.year - b.year);

    let base: DistrictAnnualSummary | undefined;
    let compare: DistrictAnnualSummary | undefined;

    if (fromYear !== undefined && toYear !== undefined) {
      base = sorted.find((r) => r.year === fromYear);
      compare = sorted.find((r) => r.year === toYear);
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
      city_code: compare.city_code,
      city_name: compare.city_name,
      district_name: compare.district_name,
      baseYear: base?.year ?? (fromYear ?? compare.year - 1),
      compareYear: compare.year,
      avgPricePerSqm: Math.round(compare.avg_price_per_sqm),
      changeRate: changeRate !== null ? Math.round(changeRate * 10) / 10 : null,
    });
  }

  return results.sort((a, b) => (b.changeRate ?? -Infinity) - (a.changeRate ?? -Infinity));
}
