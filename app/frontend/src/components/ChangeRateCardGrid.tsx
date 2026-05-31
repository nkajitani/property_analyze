'use client';
import type { CityChangeRate } from "../types/landPrice";
import ChangeRateCard from "./ChangeRateCard";

interface ChangeRateCardGridProps {
  changeRates: CityChangeRate[];
  loading: boolean;
}

function SkeletonChangeRateCard() {
  return (
    <div
      className="shimmer"
      style={{
        borderRadius: "16px",
        height: "120px",
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  );
}

export default function ChangeRateCardGrid({
  changeRates,
  loading,
}: ChangeRateCardGridProps) {
  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonChangeRateCard key={i} />
        ))}
      </div>
    );
  }

  if (changeRates.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "14px",
      }}
    >
      {changeRates.map((item) => (
        <ChangeRateCard
          key={item.city_code}
          cityCode={item.city_code}
          cityName={item.city_name}
          prefectureName={item.prefecture_name}
          baseYear={item.baseYear}
          compareYear={item.compareYear}
          avgPricePerSqm={item.avgPricePerSqm}
          changeRate={item.changeRate}
        />
      ))}
    </div>
  );
}
