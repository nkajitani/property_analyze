/**
 * FE-FMT-01〜11: utils/formatters.ts
 */
import { describe, it, expect } from "bun:test";
import { formatPrice, formatChangeRate, formatDivergenceRate } from "../../utils/formatters";

describe("formatPrice", () => {
  // FE-FMT-01
  it("FE-FMT-01: 10,000 円 → 1.0万円/㎡", () => {
    expect(formatPrice(10000)).toBe("1.0万円/㎡");
  });

  // FE-FMT-02
  it("FE-FMT-02: 9,999 円 → 9,999円/㎡", () => {
    expect(formatPrice(9999)).toBe("9,999円/㎡");
  });

  // FE-FMT-03
  it("FE-FMT-03: 1,000,000 円 → 100.0万円/㎡", () => {
    expect(formatPrice(1000000)).toBe("100.0万円/㎡");
  });

  // FE-FMT-04
  it("FE-FMT-04: 5,000 円 → 5,000円/㎡", () => {
    expect(formatPrice(5000)).toBe("5,000円/㎡");
  });
});

describe("formatChangeRate", () => {
  // FE-FMT-05
  it("FE-FMT-05: null → '—'", () => {
    expect(formatChangeRate(null)).toBe("—");
  });

  // FE-FMT-06
  it("FE-FMT-06: 5.3 → '+5.3% ▲'", () => {
    expect(formatChangeRate(5.3)).toBe("+5.3% ▲");
  });

  // FE-FMT-07
  it("FE-FMT-07: -3.2 → '-3.2% ▼'", () => {
    expect(formatChangeRate(-3.2)).toBe("-3.2% ▼");
  });

  // FE-FMT-08
  it("FE-FMT-08: 0.0 → '+0.0% ▲'", () => {
    expect(formatChangeRate(0.0)).toBe("+0.0% ▲");
  });
});

describe("formatDivergenceRate", () => {
  // FE-FMT-09
  it("FE-FMT-09: 25.0 → '+25.0%（割高）'", () => {
    expect(formatDivergenceRate(25.0)).toBe("+25.0%（割高）");
  });

  // FE-FMT-10
  it("FE-FMT-10: -12.5 → '-12.5%（割安）'", () => {
    expect(formatDivergenceRate(-12.5)).toBe("-12.5%（割安）");
  });

  // FE-FMT-11
  it("FE-FMT-11: 0.0 → '+0.0%（割高）'", () => {
    expect(formatDivergenceRate(0.0)).toBe("+0.0%（割高）");
  });
});
