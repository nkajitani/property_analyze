'use client';
import Link from "next/link";
import { useState } from "react";

interface ChangeRateCardProps {
  cityCode: string;
  cityName: string;
  prefectureName: string;
  baseYear: number;
  compareYear: number;
  avgPricePerSqm: number;
  changeRate: number | null;
}

type RateStatus = "up" | "down" | "flat" | "nodata";

function getRateStatus(changeRate: number | null): RateStatus {
  if (changeRate === null) return "nodata";
  if (changeRate > 0) return "up";
  if (changeRate < 0) return "down";
  return "flat";
}

const COLOR_MAP: Record<RateStatus, {
  accent: string;
  text: string;
  bgNormal: string;
  bgHover: string;
  border: string;
}> = {
  up: {
    accent: "#34d399",
    text: "#34d399",
    bgNormal: "rgba(52,211,153,0.05)",
    bgHover: "rgba(52,211,153,0.09)",
    border: "rgba(52,211,153,0.3)",
  },
  down: {
    accent: "#f87171",
    text: "#f87171",
    bgNormal: "rgba(248,113,113,0.05)",
    bgHover: "rgba(248,113,113,0.09)",
    border: "rgba(248,113,113,0.3)",
  },
  flat: {
    accent: "#94a3b8",
    text: "#94a3b8",
    bgNormal: "rgba(255,255,255,0.03)",
    bgHover: "rgba(255,255,255,0.06)",
    border: "rgba(148,163,184,0.3)",
  },
  nodata: {
    accent: "#334155",
    text: "#334155",
    bgNormal: "rgba(255,255,255,0.02)",
    bgHover: "rgba(255,255,255,0.04)",
    border: "rgba(51,65,85,0.3)",
  },
};

function formatChangeRate(changeRate: number | null): string {
  if (changeRate === null) return "—";
  if (changeRate > 0) return `+${changeRate.toFixed(1)}% ▲`;
  if (changeRate < 0) return `${changeRate.toFixed(1)}% ▼`;
  return "0.0%";
}

function buildAriaLabel(cityName: string, baseYear: number, compareYear: number, changeRate: number | null): string {
  if (changeRate === null) return `${cityName} ${baseYear}→${compareYear}年 データなし`;
  const sign = changeRate > 0 ? "+" : "";
  return `${cityName} ${baseYear}→${compareYear}年 ${sign}${changeRate.toFixed(1)}%`;
}

export default function ChangeRateCard({
  cityCode,
  cityName,
  prefectureName,
  baseYear,
  compareYear,
  avgPricePerSqm,
  changeRate,
}: ChangeRateCardProps) {
  const [hovered, setHovered] = useState(false);
  const status = getRateStatus(changeRate);
  const colors = COLOR_MAP[status];

  return (
    <Link
      href={`/prefecture/${cityCode.slice(0, 2)}/city/${cityCode}`}
      style={{ textDecoration: "none", display: "block" }}
    >
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={buildAriaLabel(cityName, baseYear, compareYear, changeRate)}
      style={{
        minWidth: "220px",
        borderRadius: "16px",
        padding: "20px 22px",
        background: hovered ? colors.bgHover : colors.bgNormal,
        border: `1px solid ${colors.border}`,
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: colors.accent,
        }}
      />

      {/* Prefecture + year range */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "#94a3b8",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {prefectureName}
        </span>
        <span
          className="num"
          style={{
            fontSize: "10px",
            color: "#94a3b8",
            fontWeight: 400,
          }}
        >
          {baseYear}→{compareYear}年
        </span>
      </div>

      {/* City name */}
      <p
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#f1f5f9",
          letterSpacing: "-0.03em",
          marginBottom: "14px",
          lineHeight: 1.2,
        }}
      >
        {cityName}
      </p>

      {/* Change rate label */}
      <p
        style={{
          fontSize: "10px",
          color: "#475569",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "4px",
        }}
      >
        変化率
      </p>

      {/* Change rate value */}
      <p
        className="num"
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: changeRate === null ? "#334155" : colors.text,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          marginBottom: "12px",
        }}
      >
        {formatChangeRate(changeRate)}
      </p>

      {/* Average price */}
      <p
        style={{
          fontSize: "11px",
          color: "#94a3b8",
          fontWeight: 400,
        }}
      >
        平均地価&nbsp;
        <span
          className="num"
          style={{ color: "#cbd5e1", fontWeight: 600 }}
        >
          {avgPricePerSqm >= 10_000
            ? `${(avgPricePerSqm / 10_000).toFixed(1)}万円/㎡`
            : `${avgPricePerSqm.toLocaleString()}円/㎡`}
        </span>
      </p>
    </div>
    </Link>
  );
}
