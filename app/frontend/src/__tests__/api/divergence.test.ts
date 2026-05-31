/**
 * FE-API-DIV-01〜03: api/divergence.ts fetch モックテスト
 */
import { describe, it, expect, beforeEach, mock } from "bun:test";

let mockFetchImpl: (...args: unknown[]) => Promise<unknown>;
const mockFetch = mock((...args: unknown[]) => mockFetchImpl(...args));

// @ts-expect-error fetch をモック置換
globalThis.fetch = mockFetch;

import { fetchDivergence } from "../../api/divergence";
import type { CityPriceDivergence } from "../../types/divergence";

const sampleData: CityPriceDivergence[] = [
  {
    city_code: "13101",
    city_name: "千代田区",
    prefecture_name: "東京都",
    year: 2024,
    avg_published_price: 1000000,
    avg_transaction_price: 1250000,
    divergence_rate: 25.0,
    published_count: 5,
    transaction_count: 10,
  },
];

describe("fetchDivergence", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  // FE-API-DIV-01
  it("FE-API-DIV-01: HTTP 200 → CityPriceDivergence[] を返す", async () => {
    mockFetchImpl = async () => ({
      ok: true,
      json: async () => sampleData,
    });
    const result = await fetchDivergence({});
    expect(result).toEqual(sampleData);
  });

  // FE-API-DIV-02
  it("FE-API-DIV-02: HTTP 500 → Error が throw される", async () => {
    mockFetchImpl = async () => ({
      ok: false,
      status: 500,
    });
    await expect(fetchDivergence({})).rejects.toThrow();
  });

  // FE-API-DIV-03
  it("FE-API-DIV-03: 複数パラメータが URL に含まれる", async () => {
    let capturedUrl = "";
    mockFetchImpl = async (url: unknown) => {
      capturedUrl = String(url);
      return { ok: true, json: async () => [] };
    };
    await fetchDivergence({ prefecture_code: "14", year_from: 2022 });
    expect(capturedUrl).toContain("prefecture_code=14");
    expect(capturedUrl).toContain("year_from=2022");
  });
});
