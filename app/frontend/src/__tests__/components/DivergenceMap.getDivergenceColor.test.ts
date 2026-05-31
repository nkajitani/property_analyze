/**
 * FE-COLOR-01〜09: getDivergenceColor カラースケール境界値テスト
 * DivergenceMap.tsx からエクスポートされていないので、同じロジックをテスト用に再定義
 */
import { describe, it, expect } from "bun:test";

// DivergenceMap.tsx の getDivergenceColor と同一ロジック
function getDivergenceColor(rate: number | undefined): string {
  if (rate === undefined) return "#334155";
  if (rate > 20) return "#ef4444";
  if (rate > 10) return "#f97316";
  if (rate > -10) return "#94a3b8";
  if (rate > -20) return "#60a5fa";
  return "#3b82f6";
}

describe("getDivergenceColor", () => {
  // FE-COLOR-01
  it("FE-COLOR-01: undefined → '#334155'", () => {
    expect(getDivergenceColor(undefined)).toBe("#334155");
  });

  // FE-COLOR-02
  it("FE-COLOR-02: 20.01 → '#ef4444'（大幅割高）", () => {
    expect(getDivergenceColor(20.01)).toBe("#ef4444");
  });

  // FE-COLOR-03
  it("FE-COLOR-03: 20.0 → '#f97316'（> 20 は false）", () => {
    expect(getDivergenceColor(20.0)).toBe("#f97316");
  });

  // FE-COLOR-04
  it("FE-COLOR-04: 10.01 → '#f97316'（割高）", () => {
    expect(getDivergenceColor(10.01)).toBe("#f97316");
  });

  // FE-COLOR-05
  it("FE-COLOR-05: 10.0 → '#94a3b8'（> 10 は false）", () => {
    expect(getDivergenceColor(10.0)).toBe("#94a3b8");
  });

  // FE-COLOR-06
  it("FE-COLOR-06: 0.0 → '#94a3b8'（均衡）", () => {
    expect(getDivergenceColor(0.0)).toBe("#94a3b8");
  });

  // FE-COLOR-07
  it("FE-COLOR-07: -10.0 → '#60a5fa'（> -10 は false）", () => {
    expect(getDivergenceColor(-10.0)).toBe("#60a5fa");
  });

  // FE-COLOR-08
  it("FE-COLOR-08: -20.0 → '#3b82f6'（> -20 は false）", () => {
    expect(getDivergenceColor(-20.0)).toBe("#3b82f6");
  });

  // FE-COLOR-09
  it("FE-COLOR-09: -20.01 → '#3b82f6'（大幅割安）", () => {
    expect(getDivergenceColor(-20.01)).toBe("#3b82f6");
  });
});
