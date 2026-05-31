'use client';
import axios from 'axios';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchCityAnnualSummary } from '../api/landPrices';
import type { CityAnnualSummary } from '../types/landPrice';

const PREFECTURES = [
  { code: '13', name: '東京都',   accent: '#38bdf8' },
  { code: '14', name: '神奈川県', accent: '#34d399' },
  { code: '11', name: '埼玉県',   accent: '#a78bfa' },
  { code: '12', name: '千葉県',   accent: '#fb923c' },
] as const;

interface PrefStats {
  cityCount: number;
  latestYear: number;
  latestAvg: number;
  changeRate: number | null;
}

function calcPrefStats(summaries: CityAnnualSummary[]): PrefStats | null {
  if (summaries.length === 0) return null;
  const years = [...new Set(summaries.map(s => s.year))].sort();
  const latestYear = years[years.length - 1];
  const prevYear   = years[years.length - 2];

  const latest = summaries.filter(s => s.year === latestYear);
  const prev   = summaries.filter(s => s.year === prevYear);

  const latestAvg = latest.reduce((acc, s) => acc + s.avg_price_per_sqm, 0) / latest.length;
  const prevAvg   = prev.length
    ? prev.reduce((acc, s) => acc + s.avg_price_per_sqm, 0) / prev.length
    : null;

  return {
    cityCount:  new Set(latest.map(s => s.city_code)).size,
    latestYear,
    latestAvg:  Math.round(latestAvg),
    changeRate: prevAvg != null ? ((latestAvg - prevAvg) / prevAvg) * 100 : null,
  };
}

function formatPrice(v: number): string {
  return v >= 10000 ? `${(v / 10000).toFixed(1)}万円` : `${v.toLocaleString()}円`;
}

// ── Prefecture Card ───────────────────────────────────────────────────────────

function PrefectureCard({
  code, name, accent, stats, loading,
}: {
  code: string;
  name: string;
  accent: string;
  stats: PrefStats | null;
  loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const cr = stats?.changeRate;
  const crColor = cr == null ? '#475569' : cr > 0 ? '#34d399' : cr < 0 ? '#f87171' : '#94a3b8';

  return (
    <Link
      href={`/prefecture/${code}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          borderRadius: '20px',
          padding: '28px',
          background: hovered ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.025)',
          border: hovered ? `1px solid ${accent}40` : '1px solid rgba(255,255,255,0.07)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            opacity: hovered ? 0.8 : 0.3,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Prefecture name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              Prefecture
            </p>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {name}
            </h3>
          </div>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: `${accent}18`,
              border: `1px solid ${accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent,
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[80, 120, 60].map(w => (
              <div key={w} className="shimmer" style={{ height: '18px', width: `${w}px`, borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : stats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <p style={{ fontSize: '10px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {stats.latestYear}年 平均地価
              </p>
              <p className="num" style={{ fontSize: '26px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {formatPrice(stats.latestAvg)}
                <span style={{ fontSize: '12px', color: '#475569', marginLeft: '4px', fontWeight: 400 }}>/ ㎡</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                  市区町村数
                </p>
                <p className="num" style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
                  {stats.cityCount}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                  前年比
                </p>
                <p className="num" style={{ fontSize: '16px', fontWeight: 700, color: crColor }}>
                  {cr != null ? `${cr > 0 ? '+' : ''}${cr.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#334155' }}>データなし</p>
        )}

        {/* Arrow */}
        <div
          style={{
            position: 'absolute', bottom: '24px', right: '24px',
            color: hovered ? accent : '#334155',
            transition: 'color 0.2s ease, transform 0.2s ease',
            transform: hovered ? 'translateX(3px)' : 'translateX(0)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ── TopPage ───────────────────────────────────────────────────────────────────

export default function TopPage() {
  const [summaries, setSummaries] = useState<CityAnnualSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetchCityAnnualSummary({})
      .then(setSummaries)
      .catch((e: unknown) => {
        if (axios.isAxiosError(e)) {
          setError(e.response?.data?.detail ?? e.message);
        } else {
          setError(e instanceof Error ? e.message : '取得失敗');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const statsByPref = useMemo(() => {
    const grouped: Record<string, CityAnnualSummary[]> = {};
    for (const s of summaries) {
      const code = s.city_code.slice(0, 2);
      (grouped[code] ??= []).push(s);
    }
    return Object.fromEntries(
      Object.entries(grouped).map(([code, rows]) => [code, calcPrefStats(rows)])
    );
  }, [summaries]);

  const totalCities = useMemo(() => {
    if (!summaries.length) return 0;
    const years = [...new Set(summaries.map(s => s.year))].sort();
    const latestYear = years[years.length - 1];
    return new Set(summaries.filter(s => s.year === latestYear).map(s => s.city_code)).size;
  }, [summaries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Header */}
      <div className="fade-up-1">
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '8px' }}>
          一都三県 地価インサイト
        </h2>
        <p style={{ fontSize: '14px', color: '#475569', fontWeight: 400 }}>
          東京・神奈川・埼玉・千葉の公示地価データを市区町村レベルで分析します
        </p>
      </div>

      {/* Summary strip */}
      {!loading && !error && (
        <div
          className="fade-up-2"
          style={{
            display: 'flex', gap: '28px', flexWrap: 'wrap',
            padding: '18px 24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
          }}
        >
          {[
            { label: '対象都道府県', value: '4' },
            { label: '市区町村数', value: String(totalCities) },
            { label: 'データソース', value: '国土交通省 地価公示' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '10px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{label}</p>
              <p className="num" style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px', color: '#fca5a5', fontSize: '13px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Prefecture cards */}
      <div className="fade-up-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {PREFECTURES.map(pref => (
          <PrefectureCard
            key={pref.code}
            {...pref}
            stats={statsByPref[pref.code] ?? null}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
