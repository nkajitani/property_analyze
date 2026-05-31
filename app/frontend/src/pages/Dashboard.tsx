'use client';
import axios from "axios";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchCityAnnualSummary } from "../api/landPrices";
import ChangeRateCardGrid from "../components/ChangeRateCardGrid";
import LandPriceMap from "../components/LandPriceMap";
import type { CityAnnualSummary } from "../types/landPrice";
import { calcCityChangeRates } from "../utils/calcChangeRate";


const CHART_COLORS = ["#38bdf8", "#fb923c", "#34d399", "#a78bfa", "#f472b6"];

// ── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: "rgba(6,13,31,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "12px 16px",
        minWidth: "180px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
      }}
    >
      <p
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#475569",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        {label}年
      </p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "5px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: entry.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
              {entry.name}
            </span>
          </div>
          <span
            className="num"
            style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 600 }}
          >
            {entry.value.toLocaleString()}
            <span style={{ fontSize: "10px", color: "#475569", marginLeft: "2px" }}>
              円/㎡
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="shimmer"
      style={{
        borderRadius: "16px",
        height: "96px",
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  );
}

function SkeletonChart() {
  return (
    <div
      style={{
        borderRadius: "20px",
        height: "460px",
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div
        className="shimmer"
        style={{
          height: "20px",
          width: "200px",
          borderRadius: "6px",
          background: "rgba(255,255,255,0.04)",
        }}
      />
      <div
        className="shimmer"
        style={{
          flex: 1,
          borderRadius: "10px",
          background: "rgba(255,255,255,0.03)",
        }}
      />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent = "#38bdf8" }: StatCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "16px",
        padding: "22px 24px",
        background: hovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: hovered
          ? `1px solid ${accent}30`
          : "1px solid rgba(255,255,255,0.07)",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent glow on hover */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: hovered ? 0.6 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      <p
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "10px",
        }}
      >
        {label}
      </p>
      <p
        className="num"
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#f1f5f9",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "11px", color: "#334155", marginTop: "8px", fontWeight: 400 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "20px",
        gap: "18px",
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#334155",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#475569",
            marginBottom: "6px",
            letterSpacing: "-0.02em",
          }}
        >
          データがありません
        </p>
        <p style={{ fontSize: "13px", color: "#1e293b" }}>
          都道府県コードを入力して検索してください
        </p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summaries, setSummaries] = useState<CityAnnualSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefCode, setPrefCode] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCityAnnualSummary({ prefecture_code: prefCode || undefined })
      .then(setSummaries)
      .catch((e: unknown) => {
        if (axios.isAxiosError(e)) {
          setError(e.response?.data?.detail ?? e.message);
        } else {
          setError(e instanceof Error ? e.message : "取得失敗");
        }
      })
      .finally(() => setLoading(false));
  }, [prefCode]);

  const changeRates = useMemo(
    () => calcCityChangeRates(summaries),
    [summaries]
  );

  const cities = useMemo(
    () => [...new Set(summaries.map((s) => s.city_name))],
    [summaries]
  );

  const chartData = useMemo(() => {
    const lookup = new Map(summaries.map((s) => [`${s.year}__${s.city_name}`, s]));
    return [...new Set(summaries.map((s) => s.year))]
      .sort()
      .map((year) => {
        const row: Record<string, number | string> = { year: String(year) };
        for (const city of cities) {
          const rec = lookup.get(`${year}__${city}`);
          if (rec) row[city] = Math.round(rec.avg_price_per_sqm);
        }
        return row;
      });
  }, [summaries, cities]);

  const stats = useMemo(() => {
    if (summaries.length === 0) return null;
    const years = [...new Set(summaries.map((s) => s.year))].sort();
    const latestYear = years[years.length - 1];
    const latestSummaries = summaries.filter((s) => s.year === latestYear);
    const latestAvg =
      latestSummaries.reduce((acc, s) => acc + s.avg_price_per_sqm, 0) /
      latestSummaries.length;
    return {
      cityCount: cities.length,
      yearRange: years.length > 1 ? `${years[0]} 〜 ${latestYear}` : String(years[0]),
      latestAvg: Math.round(latestAvg),
      latestYear,
    };
  }, [summaries, cities]);

  function handleSearch() {
    setPrefCode(inputValue.trim());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  function handleClear() {
    setInputValue("");
    setPrefCode("");
  }

  const visibleCities = cities.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Page header */}
      <div className="fade-up-1">
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#f1f5f9",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            marginBottom: "8px",
          }}
        >
          地価推移ダッシュボード
        </h2>
        <p style={{ fontSize: "14px", color: "#475569", fontWeight: 400 }}>
          市町村別の公示地価データを年次で可視化・分析します
        </p>
      </div>

      {/* Search row */}
      <div
        className="fade-up-2"
        style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: inputFocused ? "#38bdf8" : "#334155",
              pointerEvents: "none",
              transition: "color 0.2s ease",
              display: "flex",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="都道府県コード（例: 13）"
            style={{
              paddingLeft: "38px",
              paddingRight: "16px",
              paddingTop: "10px",
              paddingBottom: "10px",
              background: inputFocused
                ? "rgba(56,189,248,0.05)"
                : "rgba(255,255,255,0.04)",
              border: inputFocused
                ? "1px solid rgba(56,189,248,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "100px",
              color: "#e2e8f0",
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
              width: "230px",
              outline: "none",
              boxShadow: inputFocused ? "0 0 0 3px rgba(56,189,248,0.1)" : "none",
              transition: "all 0.2s ease",
            }}
          />
        </div>

        <button
          onClick={handleSearch}
          style={{
            padding: "10px 22px",
            background: "linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)",
            border: "none",
            borderRadius: "100px",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          検索
        </button>

        {prefCode && (
          <button
            onClick={handleClear}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "100px",
              color: "#475569",
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            クリア
          </button>
        )}

        {prefCode && !loading && (
          <span
            style={{
              fontSize: "12px",
              color: "#334155",
              padding: "4px 12px",
              borderRadius: "100px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            コード: <span style={{ color: "#38bdf8", fontWeight: 600 }}>{prefCode}</span>
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 18px",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.18)",
            borderRadius: "12px",
            color: "#fca5a5",
            fontSize: "13px",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div
        className="fade-up-3"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}
      >
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : stats ? (
          <>
            <StatCard
              label="市区町村数"
              value={`${stats.cityCount}`}
              sub="対象市区町村の合計"
              accent="#38bdf8"
            />
            <StatCard
              label="データ期間"
              value={stats.yearRange}
              sub="公示地価の収録範囲"
              accent="#a78bfa"
            />
            <StatCard
              label={`${stats.latestYear}年 平均地価`}
              value={
                stats.latestAvg >= 10000
                  ? `${(stats.latestAvg / 10000).toFixed(1)}万円`
                  : `${stats.latestAvg.toLocaleString()}円`
              }
              sub="㎡あたり（全市区町村平均）"
              accent="#34d399"
            />
          </>
        ) : (
          <>
            <StatCard label="市区町村数" value="—" accent="#38bdf8" />
            <StatCard label="データ期間" value="—" accent="#a78bfa" />
            <StatCard label="平均地価" value="—" accent="#34d399" />
          </>
        )}
      </div>

      {/* Change rate card grid */}
      <div className="fade-up-4">
        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#e2e8f0",
              letterSpacing: "-0.025em",
              marginBottom: "3px",
            }}
          >
            市区町村別 前年比変化率
          </h3>
          <p style={{ fontSize: "11px", color: "#334155" }}>
            前年の平均地価との比較（降順表示）
          </p>
        </div>
        <ChangeRateCardGrid
          changeRates={changeRates}
          loading={loading}
        />
      </div>

      {/* Land price map */}
      <div className="fade-up-4">
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.025em", marginBottom: "3px" }}>
            地価変化率マップ
          </h3>
          <p style={{ fontSize: "11px", color: "#334155" }}>
            前年比変化率の地域分布（一都三県）
          </p>
        </div>
        <LandPriceMap changeRates={changeRates} />
      </div>

      {/* Chart area */}
      <div className="fade-up-4">
        {loading && <SkeletonChart />}

        {!loading && !error && chartData.length === 0 && <EmptyState />}

        {!loading && !error && chartData.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "20px",
              padding: "28px 28px 20px",
            }}
          >
            {/* Chart header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "28px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#e2e8f0",
                    letterSpacing: "-0.025em",
                    marginBottom: "3px",
                  }}
                >
                  市町村別 地価推移
                </h3>
                <p style={{ fontSize: "11px", color: "#334155" }}>
                  ㎡単価（円）· 上位 {visibleCities.length} 市区町村
                </p>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {visibleCities.map((city, i) => (
                  <span
                    key={city}
                    style={{
                      fontSize: "11px",
                      padding: "4px 11px",
                      borderRadius: "100px",
                      background: `${CHART_COLORS[i % CHART_COLORS.length]}14`,
                      border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}35`,
                      color: CHART_COLORS[i % CHART_COLORS.length],
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{
                    fill: "#334155",
                    fontSize: 11,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 500,
                  }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                  tickFormatter={(v: string) => `${v}年`}
                />
                <YAxis
                  tick={{
                    fill: "#334155",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 400,
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)
                  }
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                {visibleCities.map((city, i) => (
                  <Line
                    key={city}
                    type="monotone"
                    dataKey={city}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    strokeLinecap="round"
                    activeDot={{
                      r: 5,
                      fill: CHART_COLORS[i % CHART_COLORS.length],
                      stroke: "#060d1f",
                      strokeWidth: 2,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
