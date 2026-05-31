'use client';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchDivergence } from '../api/divergence';
import { fetchCityAnnualSummary, fetchLandUses } from '../api/landPrices';
import DivergenceMap from '../components/DivergenceMap';
import LandPriceMap from '../components/LandPriceMap';
import type { CityPriceDivergence } from '../types/divergence';
import type { CityAnnualSummary } from '../types/landPrice';
import { calcCityChangeRates } from '../utils/calcChangeRate';

const PREF_NAMES: Record<string, string> = {
  '11': '埼玉県',
  '12': '千葉県',
  '13': '東京都',
  '14': '神奈川県',
};

const CHART_COLORS = ['#38bdf8', '#fb923c', '#34d399', '#a78bfa', '#f472b6', '#facc15', '#e879f9', '#4ade80', '#f97316', '#60a5fa'];

// ── select スタイル ────────────────────────────────────────────────────────────

const SELECT_STYLE: React.CSSProperties = {
  appearance: 'none' as const,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '12px',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 500,
  padding: '5px 28px 5px 10px',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  minWidth: '80px',
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry { name: string; value: number; color: string }
interface CustomTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: 'rgba(6,13,31,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', minWidth: '180px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>{label}年</p>
      {payload.map(entry => (
        <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{entry.name}</span>
          </div>
          <span className="num" style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
            {entry.value.toLocaleString()}
            <span style={{ fontSize: '10px', color: '#475569', marginLeft: '2px' }}>円/㎡</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonChart() {
  return (
    <div style={{ borderRadius: '20px', height: '420px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="shimmer" style={{ height: '20px', width: '200px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)' }} />
      <div className="shimmer" style={{ flex: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }} />
    </div>
  );
}

// ── PrefecturePage ────────────────────────────────────────────────────────────

export default function PrefecturePage({ code }: { code: string }) {
  const router = useRouter();
  const prefName = PREF_NAMES[code] ?? `都道府県 ${code}`;

  const [summaries, setSummaries]     = useState<CityAnnualSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [landUses, setLandUses]       = useState<string[]>([]);
  const [selectedUse, setSelectedUse] = useState<string>('');

  // 年度比較
  const [fromYear, setFromYear] = useState<number | null>(null);
  const [toYear, setToYear]     = useState<number | null>(null);

  // チャート表示市区町村
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());

  // 乖離分析
  const [divData, setDivData] = useState<CityPriceDivergence[]>([]);
  const [divYear, setDivYear] = useState<number>(2024);

  // 用途選択肢を初回取得
  useEffect(() => {
    fetchLandUses().then(setLandUses).catch(() => {});
  }, []);

  // 乖離データ取得
  useEffect(() => {
    fetchDivergence({ prefecture_code: code, land_use: selectedUse || undefined })
      .then(setDivData)
      .catch(() => {});
  }, [code, selectedUse]);

  // 都道府県が変わったら年度選択をリセット
  useEffect(() => {
    setFromYear(null);
    setToYear(null);
  }, [code]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCityAnnualSummary({
      prefecture_code: code,
      land_use: selectedUse || undefined,
    })
      .then(setSummaries)
      .catch((e: unknown) => {
        if (axios.isAxiosError(e)) {
          setError(e.response?.data?.detail ?? e.message);
        } else {
          setError(e instanceof Error ? e.message : '取得失敗');
        }
      })
      .finally(() => setLoading(false));
  }, [code, selectedUse]);

  // データから取得できる年度一覧
  const availableYears = useMemo(
    () => [...new Set(summaries.map(s => s.year))].sort(),
    [summaries],
  );

  // 有効な比較年度（未選択なら最新2年をデフォルト）
  const effectiveFromYear = useMemo(() => {
    if (fromYear !== null) return fromYear;
    return availableYears.length >= 2 ? availableYears[availableYears.length - 2] : availableYears[0];
  }, [fromYear, availableYears]);

  const effectiveToYear = useMemo(() => {
    if (toYear !== null) return toYear;
    return availableYears.length >= 1 ? availableYears[availableYears.length - 1] : undefined;
  }, [toYear, availableYears]);

  const changeRates = useMemo(
    () => calcCityChangeRates(summaries, effectiveFromYear, effectiveToYear),
    [summaries, effectiveFromYear, effectiveToYear],
  );

  const cities = useMemo(() => [...new Set(summaries.map(s => s.city_name))], [summaries]);

  // 市区町村ごとに固定色を割り当て
  const cityColorMap = useMemo(() => {
    const map = new Map<string, string>();
    cities.forEach((city, i) => {
      map.set(city, CHART_COLORS[i % CHART_COLORS.length]);
    });
    return map;
  }, [cities]);

  // 都道府県が変わったら上位5件を初期選択
  useEffect(() => {
    setSelectedCities(new Set(cities.slice(0, 5)));
  }, [cities]);

  const toggleCity = useCallback((city: string) => {
    setSelectedCities(prev => {
      const next = new Set(prev);
      if (next.has(city)) {
        if (next.size > 1) next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  }, []);

  const handleCityClick = useCallback((cityCode: string) => {
    router.push(`/prefecture/${code}/city/${cityCode}`);
  }, [code, router]);

  const selectedCityList = useMemo(
    () => cities.filter(c => selectedCities.has(c)),
    [cities, selectedCities],
  );

  const chartData = useMemo(() => {
    const lookup = new Map(summaries.map(s => [`${s.year}__${s.city_name}`, s]));
    return availableYears.map(year => {
      const row: Record<string, number | string> = { year: String(year) };
      for (const city of selectedCityList) {
        const rec = lookup.get(`${year}__${city}`);
        if (rec) row[city] = Math.round(rec.avg_price_per_sqm);
      }
      return row;
    });
  }, [summaries, availableYears, selectedCityList]);

  const stats = useMemo(() => {
    if (!summaries.length) return null;
    const latestYear = availableYears[availableYears.length - 1];
    const latest = summaries.filter(s => s.year === latestYear);
    const latestAvg = latest.reduce((acc, s) => acc + s.avg_price_per_sqm, 0) / latest.length;
    return {
      cityCount: cities.length,
      yearRange: availableYears.length > 1 ? `${availableYears[0]} 〜 ${latestYear}` : String(latestYear),
      latestAvg: Math.round(latestAvg),
      latestYear,
    };
  }, [summaries, cities, availableYears]);

  const periodLabel = effectiveFromYear && effectiveToYear
    ? `${effectiveFromYear}→${effectiveToYear}年`
    : '';

  const divAvailableYears = useMemo(
    () => [...new Set(divData.map((d) => d.year))].sort((a, b) => a - b),
    [divData]
  );
  const divFiltered = useMemo(
    () => divData.filter((d) => d.year === divYear),
    [divData, divYear]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Back link */}
      <div className="fade-up-1">
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: '#475569', textDecoration: 'none',
            marginBottom: '16px',
            transition: 'color 0.2s ease',
          }}
          onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = '#94a3b8')}
          onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>)  => (e.currentTarget.style.color = '#475569')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          都道府県一覧に戻る
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '6px' }}>
              {prefName}
            </h2>
            <p style={{ fontSize: '14px', color: '#475569' }}>
              市区町村別の公示地価データを年次で分析します
            </p>
          </div>

          {/* フィルター群 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
            {/* 用途フィルター */}
            {landUses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  用途
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['', ...landUses].map(use => {
                    const active = selectedUse === use;
                    return (
                      <button
                        key={use || '__all__'}
                        onClick={() => setSelectedUse(use)}
                        style={{
                          padding: '5px 13px',
                          borderRadius: '100px',
                          fontSize: '12px',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
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
              </div>
            )}

            {/* 比較期間セレクター */}
            {availableYears.length >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  比較期間
                </span>
                <select
                  value={effectiveFromYear ?? ''}
                  onChange={e => setFromYear(Number(e.target.value))}
                  disabled={loading}
                  style={SELECT_STYLE}
                >
                  {availableYears
                    .filter(y => y < (effectiveToYear ?? Infinity))
                    .map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <span style={{ color: '#334155', fontSize: '14px' }}>→</span>
                <select
                  value={effectiveToYear ?? ''}
                  onChange={e => setToYear(Number(e.target.value))}
                  disabled={loading}
                  style={SELECT_STYLE}
                >
                  {availableYears
                    .filter(y => y > (effectiveFromYear ?? -Infinity))
                    .map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px', color: '#fca5a5', fontSize: '13px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Stat strip */}
      <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <div key={i} className="shimmer" style={{ borderRadius: '14px', height: '80px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} />
          ))
        ) : stats ? (
          [
            { label: '市区町村数',              value: `${stats.cityCount}` },
            { label: 'データ期間',               value: stats.yearRange },
            { label: `${stats.latestYear}年 平均地価`, value: stats.latestAvg >= 10000 ? `${(stats.latestAvg / 10000).toFixed(1)}万円` : `${stats.latestAvg.toLocaleString()}円` },
          ].map(({ label, value }) => (
            <div key={label} style={{ borderRadius: '14px', padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{label}</p>
              <p className="num" style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
            </div>
          ))
        ) : null}
      </div>

      {/* Map */}
      <div className="fade-up-3">
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.025em', marginBottom: '3px' }}>
            地価変化率マップ
            {periodLabel && (
              <span className="num" style={{ fontSize: '12px', fontWeight: 500, color: '#475569', marginLeft: '8px' }}>（{periodLabel}）</span>
            )}
          </h3>
          <p style={{ fontSize: '11px', color: '#334155' }}>変化率の地域分布</p>
        </div>
        <LandPriceMap changeRates={changeRates} prefectureCode={code} onCityClick={handleCityClick} />
      </div>

      {/* Chart */}
      <div className="fade-up-4">
        {loading && <SkeletonChart />}
        {!loading && !error && chartData.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '28px 28px 20px' }}>
            {/* Chart header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.025em', marginBottom: '3px' }}>市町村別 地価推移</h3>
                <p style={{ fontSize: '11px', color: '#334155' }}>
                  ㎡単価（円）· 表示中: {selectedCityList.length} / 全{cities.length}市区町村
                </p>
              </div>
            </div>

            {/* 市区町村選択ピル */}
            <div style={{ overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', minWidth: 'max-content' }}>
                {cities.map(city => {
                  const selected = selectedCities.has(city);
                  const color = cityColorMap.get(city) ?? '#475569';
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      style={{
                        padding: '4px 11px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: selected ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.06)',
                        background: selected ? `${color}18` : 'rgba(255,255,255,0.02)',
                        color: selected ? color : '#334155',
                        flexShrink: 0,
                      }}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#334155', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} tickFormatter={(v: string) => `${v}年`} />
                <YAxis tick={{ fill: '#334155', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 400 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)} width={44} />
                <Tooltip content={<CustomTooltip />} />
                {selectedCityList.map(city => (
                  <Line
                    key={city}
                    type="monotone"
                    dataKey={city}
                    stroke={cityColorMap.get(city)}
                    strokeWidth={2}
                    dot={false}
                    strokeLinecap="round"
                    activeDot={{ r: 5, fill: cityColorMap.get(city), stroke: '#060d1f', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 乖離幅分析 */}
      <div className="fade-up-4">
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.025em', marginBottom: '3px' }}>
            乖離幅分析
          </h3>
          <p style={{ fontSize: '11px', color: '#334155' }}>
            公示地価と実取引価格の乖離率（正＝割高・負＝割安）
          </p>
        </div>
        {/* 年度ピル */}
        {divAvailableYears.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
        )}
        {divFiltered.length > 0 ? (
          <DivergenceMap
            key={divYear}
            divergences={divFiltered}
            selectedYear={divYear}
            prefCode={code}
            level="city"
            onCityClick={handleCityClick}
          />
        ) : (
          <div className="shimmer" style={{ height: '500px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }} />
        )}
      </div>
    </div>
  );
}
