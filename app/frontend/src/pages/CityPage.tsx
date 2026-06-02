'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchTownDivergence } from '../api/divergence';
import { fetchDistrictAnnualSummary, fetchLandUses } from '../api/landPrices';
import DistrictChangeRateMap from '../components/DistrictChangeRateMap';
import DivergenceMap from '../components/DivergenceMap';
import type { TownPriceDivergence } from '../types/divergence';
import type { DistrictAnnualSummary, DistrictChangeRate } from '../types/landPrice';
import { calcDistrictChangeRates } from '../utils/calcDistrictChangeRate';

const PREF_NAMES: Record<string, string> = {
  '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県',
};


interface ChartDataPoint {
  year: number;
  [district: string]: number;
}

const LINE_COLORS = [
  '#38bdf8', '#34d399', '#f87171', '#f97316', '#a78bfa',
  '#fb923c', '#4ade80', '#60a5fa', '#e879f9', '#fbbf24',
  '#6ee7b7', '#93c5fd',
];

type RateStatus = 'up' | 'down' | 'flat' | 'nodata';

function getRateStatus(r: number | null): RateStatus {
  if (r === null) return 'nodata';
  if (r > 0) return 'up';
  if (r < 0) return 'down';
  return 'flat';
}

const COLORS: Record<RateStatus, { accent: string; text: string; bg: string; border: string }> = {
  up:     { accent: '#34d399', text: '#34d399', bg: 'rgba(52,211,153,0.05)',  border: 'rgba(52,211,153,0.3)' },
  down:   { accent: '#f87171', text: '#f87171', bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.3)' },
  flat:   { accent: '#94a3b8', text: '#94a3b8', bg: 'rgba(255,255,255,0.03)', border: 'rgba(148,163,184,0.3)' },
  nodata: { accent: '#334155', text: '#334155', bg: 'rgba(255,255,255,0.02)', border: 'rgba(51,65,85,0.3)' },
};

function formatRate(r: number | null): string {
  if (r === null) return '—';
  if (r > 0) return `+${r.toFixed(1)}% ▲`;
  if (r < 0) return `${r.toFixed(1)}% ▼`;
  return '0.0%';
}

function DistrictCard({ item }: { item: DistrictChangeRate }) {
  const status = getRateStatus(item.changeRate);
  const c = COLORS[status];
  return (
    <div style={{ borderRadius: '16px', padding: '18px 20px', background: c.bg, border: `1px solid ${c.border}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: c.accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.city_name}</span>
        <span className="num" style={{ fontSize: '10px', color: '#94a3b8' }}>{item.baseYear}→{item.compareYear}年</span>
      </div>
      <p style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px', letterSpacing: '-0.02em' }}>{item.district_name}</p>
      <p className="num" style={{ fontSize: '24px', fontWeight: 700, color: item.changeRate === null ? '#334155' : c.text, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '8px' }}>
        {formatRate(item.changeRate)}
      </p>
      <p style={{ fontSize: '11px', color: '#94a3b8' }}>
        平均&nbsp;<span className="num" style={{ color: '#cbd5e1', fontWeight: 600 }}>
          {item.avgPricePerSqm >= 10_000
            ? `${(item.avgPricePerSqm / 10_000).toFixed(1)}万円/㎡`
            : `${item.avgPricePerSqm.toLocaleString()}円/㎡`}
        </span>
      </p>
    </div>
  );
}

interface Props {
  cityCode: string;
}

export default function CityPage({ cityCode }: Props) {
  const [summaries, setSummaries] = useState<DistrictAnnualSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromYear, setFromYear] = useState<number | null>(null);
  const [toYear, setToYear] = useState<number | null>(null);
  const [selectedDistricts, setSelectedDistricts] = useState<Set<string>>(new Set());
  const [divData, setDivData] = useState<TownPriceDivergence[]>([]);
  const [divYear, setDivYear] = useState<number>(2024);
  const [divLandUse, setDivLandUse] = useState<string>('');
  const [landUses, setLandUses] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchDistrictAnnualSummary({ city_code: cityCode })
      .then(setSummaries)
      .catch(() => setError('データを取得できませんでした。'))
      .finally(() => setLoading(false));
  }, [cityCode]);

  useEffect(() => {
    fetchLandUses().then(setLandUses).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTownDivergence({ city_code: cityCode, land_use: divLandUse || undefined })
      .then(setDivData)
      .catch(() => {});
  }, [cityCode, divLandUse]);


  const availableYears = useMemo(
    () => [...new Set(summaries.map((s) => s.year))].sort((a, b) => a - b),
    [summaries]
  );

  const cityName = summaries[0]?.city_name ?? cityCode;

  const effectiveFrom = fromYear ?? (availableYears.length >= 2 ? availableYears[availableYears.length - 2] : undefined);
  const effectiveTo = toYear ?? (availableYears.length >= 1 ? availableYears[availableYears.length - 1] : undefined);

  const changeRates = useMemo(
    () => calcDistrictChangeRates(summaries, effectiveFrom, effectiveTo),
    [summaries, effectiveFrom, effectiveTo]
  );

  const allDistricts = useMemo(
    () => [...new Set(summaries.map((s) => s.district_name))].sort(),
    [summaries]
  );

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    allDistricts.forEach((d, i) => map.set(d, LINE_COLORS[i % LINE_COLORS.length]));
    return map;
  }, [allDistricts]);

  // top5 をデフォルト選択
  useEffect(() => {
    if (changeRates.length === 0) return;
    const top5 = changeRates.slice(0, 5).map((r) => r.district_name);
    setSelectedDistricts(new Set(top5));
  }, [changeRates.length > 0]);  // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDistrict = useCallback((d: string) => {
    setSelectedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(d)) { next.delete(d); } else { next.add(d); }
      return next;
    });
  }, []);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const byYear = new Map<number, ChartDataPoint>();
    for (const s of summaries) {
      if (!byYear.has(s.year)) byYear.set(s.year, { year: s.year });
      byYear.get(s.year)![s.district_name] = Math.round(s.avg_price_per_sqm);
    }
    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [summaries]);

  const selectedList = useMemo(() => [...selectedDistricts], [selectedDistricts]);

  const divAvailableYears = useMemo(
    () => [...new Set(divData.map((d) => d.year))].sort((a, b) => a - b),
    [divData]
  );
  const divFiltered = useMemo(
    () => divData.filter((d) => d.year === divYear),
    [divData, divYear]
  );


  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ color: '#f87171', fontSize: '14px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
          <a href="/" style={{ color: '#475569', textDecoration: 'none' }}>ホーム</a>
          {' › '}
          <a href={`/prefecture/${cityCode.slice(0, 2)}`} style={{ color: '#475569', textDecoration: 'none' }}>
            {PREF_NAMES[cityCode.slice(0, 2)] ?? '都道府県'}
          </a>
          {' › '}{cityName}
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', marginBottom: '8px' }}>
          {cityName}
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          町別地価変化率（公示地価ベース）
        </p>
      </div>

      {/* 年度セレクター */}
      {availableYears.length >= 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>比較期間</span>
          <select
            value={effectiveFrom ?? ''}
            onChange={(e) => setFromYear(Number(e.target.value))}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', color: '#f1f5f9', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            {availableYears.map((y) => (
              <option key={y} value={y} style={{ background: '#0f172a' }}>{y}年</option>
            ))}
          </select>
          <span style={{ color: '#475569' }}>→</span>
          <select
            value={effectiveTo ?? ''}
            onChange={(e) => setToYear(Number(e.target.value))}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', color: '#f1f5f9', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            {availableYears.map((y) => (
              <option key={y} value={y} style={{ background: '#0f172a' }}>{y}年</option>
            ))}
          </select>
        </div>
      )}

      {/* 町別変化率マップ */}
      {changeRates.length > 0 && (
        <DistrictChangeRateMap cityCode={cityCode} changeRates={changeRates} />
      )}

      {/* 町別変化率カードグリッド */}
      {changeRates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '40px' }}>
          {changeRates.map((item) => (
            <DistrictCard key={item.district_name} item={item} />
          ))}
        </div>
      )}

      {/* 折れ線グラフ */}
      {chartData.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            町別 地価推移（円/㎡）
          </h2>
          {/* 町選択ピル */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
            {allDistricts.map((d) => {
              const isSelected = selectedDistricts.has(d);
              const color = colorMap.get(d) ?? '#94a3b8';
              return (
                <button
                  key={d}
                  onClick={() => toggleDistrict(d)}
                  style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '20px', border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`, background: isSelected ? `${color}22` : 'rgba(255,255,255,0.03)', color: isSelected ? color : '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)} />
              <Tooltip
                contentStyle={{ background: 'rgba(6,13,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                formatter={(value: number, name: string, entry: { color?: string }) => {
                  const color = entry?.color ?? '#94a3b8';
                  return [<span key={name} style={{ color }}>{value.toLocaleString()}円/㎡</span>, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              {selectedList.map((d) => (
                <Line key={d} type="monotone" dataKey={d} stroke={colorMap.get(d) ?? '#94a3b8'} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 町別 乖離幅分析 */}
      {divData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            町別 乖離幅分析
          </h2>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
            公示地価と実取引価格の乖離率（正＝割高・負＝割安）
          </p>
          {/* 用途フィルター */}
          {landUses.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {['', ...landUses].map((use) => {
                const active = divLandUse === use;
                return (
                  <button
                    key={use || '__all__'}
                    onClick={() => setDivLandUse(use)}
                    style={{
                      padding: '5px 13px',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: active ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      background: active ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#38bdf8' : '#64748b',
                    }}
                  >
                    {use || 'すべて'}
                  </button>
                );
              })}
            </div>
          )}
          {/* 年度ピル */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {divAvailableYears.map((y) => (
              <button
                key={y}
                onClick={() => setDivYear(y)}
                style={{
                  background: y === divYear ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${y === divYear ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px', padding: '5px 12px',
                  color: y === divYear ? '#38bdf8' : '#94a3b8',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {y}年
              </button>
            ))}
          </div>
          {divFiltered.length > 0 ? (
            <DivergenceMap
              key={divYear}
              divergences={divFiltered}
              selectedYear={divYear}
              prefCode={cityCode.slice(0, 2)}
              cityCode={cityCode}
              level="town"
            />
          ) : (
            <div className="shimmer" style={{ height: '420px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }} />
          )}
        </div>
      )}
    </div>
  );
}
