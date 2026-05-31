/**
 * FE-API-TX-01〜04: api/transactions.ts fetch モックテスト
 */
import { describe, it, expect, beforeEach, mock } from "bun:test";

// globalThis.fetch をモック化
let mockFetchImpl: (...args: unknown[]) => Promise<unknown>;

const mockFetch = mock((...args: unknown[]) => mockFetchImpl(...args));

// @ts-expect-error fetch をモック置換
globalThis.fetch = mockFetch;

import { fetchTransactionSummary } from "../../api/transactions";
import type { TransactionCityAnnualSummary } from "../../types/transaction";

const sampleData: TransactionCityAnnualSummary[] = [
  {
    city_code: "13101",
    city_name: "千代田区",
    prefecture_name: "東京都",
    year: 2024,
    quarter: null,
    avg_price_per_sqm: 800000,
    min_price_per_sqm: 500000,
    max_price_per_sqm: 1200000,
    avg_trade_price: 80000000,
    record_count: 10,
  },
];

describe("fetchTransactionSummary", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  // FE-API-TX-01
  it("FE-API-TX-01: HTTP 200 → TransactionCityAnnualSummary[] を返す", async () => {
    mockFetchImpl = async () => ({
      ok: true,
      json: async () => sampleData,
    });
    const result = await fetchTransactionSummary({});
    expect(result).toEqual(sampleData);
  });

  // FE-API-TX-02
  it("FE-API-TX-02: HTTP 404 → Error が throw される", async () => {
    mockFetchImpl = async () => ({
      ok: false,
      status: 404,
    });
    await expect(fetchTransactionSummary({})).rejects.toThrow();
  });

  // FE-API-TX-03
  it("FE-API-TX-03: aggregate_by='quarterly' がクエリに含まれる", async () => {
    let capturedUrl = "";
    mockFetchImpl = async (url: unknown) => {
      capturedUrl = String(url);
      return { ok: true, json: async () => [] };
    };
    await fetchTransactionSummary({ aggregate_by: "quarterly" });
    expect(capturedUrl).toContain("aggregate_by=quarterly");
  });

  // FE-API-TX-04
  it("FE-API-TX-04: undefined パラメータはクエリに含まれない", async () => {
    let capturedUrl = "";
    mockFetchImpl = async (url: unknown) => {
      capturedUrl = String(url);
      return { ok: true, json: async () => [] };
    };
    await fetchTransactionSummary({ prefecture_code: undefined });
    expect(capturedUrl).not.toContain("prefecture_code");
  });
});
