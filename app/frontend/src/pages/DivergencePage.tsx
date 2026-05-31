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
import { fetchDivergence, fetchTownDivergence } from '../api/divergence';
import DivergenceMap from '../components/DivergenceMap';
import type { CityPriceDivergence, TownPriceDivergence } from '../types/divergence';

type Level = 'city' | 'town';
type DivergenceItem = CityPriceDivergence | TownPriceDivergence;

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartDataPoint {
  year: number;
  [key: string]: number;
}

const LINE_COLORS = [
  '#38bdf8', '#34d399', '#f87171', '#f97316', '#a78bfa',
  '#fb923c', '#4ade80', '#60a5fa', '#e879f9', '#fbbf24',
  '#6ee7b7', '#93c5fd',
];

const PREF_OPTIONS = [
  { value: '11', label: '埼玉県' },
  { value: '12', label: '千葉県' },
  { value: '13', label: '東京都' },
  { value: '14', label: '神奈川県' },
];

function itemKey(d: DivergenceItem): string {
  return 'district_name' in d ? `${d.city_code}__${d.district_name}` : d.city_code;
}

function itemLabel(d: DivergenceItem): string {
  return 'district_name' in d ? `${d.city_name} ${d.district_name}` : d.city_name;
}

export default function DivergencePage() {
  const [divergences, setDivergences] = useState<DivergenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefCode, setPrefCode] = useState<string>('');
  const [inputPrefCode, setInputPrefCode] = useState<string>('13');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [level, setLevel] = useState<Level>('city');

  const loadData = useCallback(async (code: string, lv: Level) => {
    setLoading(true);
    setError(null);
    try {
      const data = lv === 'town'
        ? await fetchTownDivergence({ prefecture_code: code })
        : await fetchDivergence({ prefecture_code: code });
      setDivergences(data);
    } catch {
      setError('データを取得できませんでした。');
      setDivergences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!prefCode) return;
    void loadData(prefCode, level);
  }, [prefCode, level, loadData]);

  const availableYears = useMemo(
    () => [...new Set(divergences.map((d) => d.year))].sort((a, b) => a - b),
    [divergences]
  );

  const filteredByYear = useMemo(
    () => divergences.filter((d) => d.year === selectedYear),
    [divergences, selectedYear]
  );

  const allItemKeys = useMemo(
    () => [...new Map(divergences.map((d) => [itemKey(d), itemLabel(d)])).entries()],
    [divergences]
  );

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    allItemKeys.forEach(([k], i) => map.set(k, LINE_COLORS[i % LINE_COLORS.length]));
    return map;
  }, [allItemKeys]);

  // 都道府県・粒度変更時に top5 をデフォルト選択
  useEffect(() => {
    if (divergences.length === 0) { setSelectedKeys(new Set()); return; }
    const yearData = divergences.filter((d) => d.year === selectedYear);
    if (yearData.length === 0) return;
    const top5 = [...yearData]
      .sort((a, b) => Math.abs(b.divergence_rate) - Math.abs(a.divergence_rate))
      .slice(0, 5)
      .map(itemKey);
    setSelectedKeys(new Set(top5));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divergences]);

  const toggleKey = useCallback((k: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) { next.delete(k); } else { next.add(k); }
      return next;
    });
  }, []);

  const maxDivergence = useMemo(
    () => filteredByYear.reduce<DivergenceItem | null>(
      (acc, d) => (acc === null || d.divergence_rate > acc.divergence_rate ? d : acc), null
    ),
    [filteredByYear]
  );

  const minDivergence = useMemo(
    () => filteredByYear.reduce<DivergenceItem | null>(
      (acc, d) => (acc === null || d.divergence_rate < acc.divergence_rate ? d : acc), null
    ),
    [filteredByYear]
  );

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const byYear = new Map<number, ChartDataPoint>();
    for (const d of divergences) {
      if (!byYear.has(d.year)) byYear.set(d.year, { year: d.year });
      byYear.get(d.year)![itemKey(d)] = d.divergence_rate;
    }
    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [divergences]);

  const selectedKeyList = useMemo(() => [...selectedKeys], [selectedKeys]);
  const hasData = divergences.length > 0;

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', marginBottom: '8px' }}>
          乖離幅分析
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
          地価公示（公示地価）と不動産取引価格の乖離幅を市区町村別に可視化します。
          正の値は取引価格が公示地価を上回る（割高）、負の値は割安を示します。
        </p>
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>都道府県</label>
        <select
          value={inputPrefCode}
          onChange={(e) => setInputPrefCode(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 12px', color: '#f1f5f9', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
        >
          {PREF_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#0f172a' }}>{o.label}</option>
          ))}
        </select>

        {/* 粒度トグル */}
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', overflow: 'hidden' }}>
          {(['city', 'town'] as Level[]).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              style={{
                padding: '8px 14px',
                background: level === lv ? 'rgba(56,189,248,0.15)' : 'transparent',
                border: 'none',
                borderRight: lv === 'city' ? '1px solid rgba(255,255,255,0.12)' : 'none',
                color: level === lv ? '#38bdf8' : '#94a3b8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {lv === 'city' ? '市区町村' : '町'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPrefCode(inputPrefCode)}
          disabled={loading}
          style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', padding: '8px 16px', color: '#38bdf8', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '読み込み中…' : '適用'}
        </button>
      </div>

      {!prefCode && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569', fontSize: '14px' }}>
          都道府県を選択して「適用」を押してください
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px', color: '#f87171', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {hasData && (
        <>
          {/* 年度セレクター */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                style={{ background: year === selectedYear ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${year === selectedYear ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '6px 14px', color: year === selectedYear ? '#38bdf8' : '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                {year}年
              </button>
            ))}
          </div>

          {/* サマリーカード */}
          {filteredByYear.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {maxDivergence && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>最大乖離（割高）エリア</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>{itemLabel(maxDivergence)}</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.03em' }}>+{maxDivergence.divergence_rate.toFixed(1)}%</p>
                </div>
              )}
              {minDivergence && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>最小乖離（割安）エリア</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>{itemLabel(minDivergence)}</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', letterSpacing: '-0.03em' }}>{minDivergence.divergence_rate.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}

          {/* マップ */}
          <div style={{ marginBottom: '32px' }}>
            <DivergenceMap
              divergences={filteredByYear}
              selectedYear={selectedYear}
              prefCode={prefCode}
              level={level}
            />
          </div>

          {/* 折れ線グラフ */}
          {chartData.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                乖離率 全年度推移
              </h2>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
                {allItemKeys.map(([k, label]) => {
                  const isSelected = selectedKeys.has(k);
                  const color = colorMap.get(k) ?? '#94a3b8';
                  return (
                    <button
                      key={k}
                      onClick={() => toggleKey(k)}
                      style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '20px', border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.1)'}`, background: isSelected ? `${color}22` : 'rgba(255,255,255,0.03)', color: isSelected ? color : '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(6,13,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                    formatter={(value: number, name: string, _: unknown, __: unknown, payload?: TooltipPayloadEntry) => {
                      const color = payload?.color ?? '#94a3b8';
                      return [<span key={name} style={{ color }}>{value.toFixed(1)}%</span>, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                  {selectedKeyList.map((k) => (
                    <Line key={k} type="monotone" dataKey={k} name={allItemKeys.find(([ik]) => ik === k)?.[1] ?? k} stroke={colorMap.get(k) ?? '#94a3b8'} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
