'use client';
import type { MapGeoJSONFeature, Map as MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, Source } from 'react-map-gl/maplibre';
import type { DistrictChangeRate } from '../types/landPrice';

interface Props {
  cityCode: string;
  changeRates: DistrictChangeRate[];
}

interface HoverInfo {
  x: number;
  y: number;
  districtName: string;
}

interface GeoJSONProperties {
  city_code: string;
  district_name?: string;
  fill_color?: string;
  fill_opacity?: number;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: GeoJSONProperties;
  geometry: object;
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW = { longitude: 139.6917, latitude: 35.6895, zoom: 11 };
const OPACITY_NORMAL = 0.7;
const OPACITY_HOVER = 0.9;
const OPACITY_NODATA = 0.25;

function getColor(rate: number | null): string {
  if (rate === null) return '#334155';
  if (rate > 0) return '#34d399';
  if (rate < 0) return '#f87171';
  return '#94a3b8';
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  if (rate > 0) return `+${rate.toFixed(1)}% ▲`;
  if (rate < 0) return `${rate.toFixed(1)}% ▼`;
  return '0.0%';
}

function Legend() {
  const items = [
    { color: '#34d399', label: '上昇 ▲' },
    { color: '#94a3b8', label: '変化なし' },
    { color: '#f87171', label: '下降 ▼' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: '24px', right: '12px', background: 'rgba(6,13,31,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1, pointerEvents: 'none' }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DistrictChangeRateMap({ cityCode, changeRates }: Props) {
  const [geoJson, setGeoJson] = useState<GeoJSONCollection | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    setGeoLoading(true);
    fetch('/geo/towns.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
        return res.json() as Promise<GeoJSONCollection>;
      })
      .then(setGeoJson)
      .catch((err: unknown) => console.error('GeoJSON fetch error:', err))
      .finally(() => setGeoLoading(false));
  }, []);

  const rateMap = useMemo(
    () => new Map<string, DistrictChangeRate>(changeRates.map((r) => [r.district_name, r])),
    [changeRates]
  );

  const coloredGeoJson = useMemo<GeoJSONCollection | null>(() => {
    if (!geoJson) return null;
    return {
      ...geoJson,
      features: geoJson.features
        .filter((f) => f.properties.city_code === cityCode)
        .map((feature) => {
          const data = rateMap.get(feature.properties.district_name ?? '');
          return {
            ...feature,
            properties: {
              ...feature.properties,
              fill_color: getColor(data?.changeRate ?? null),
              fill_opacity: data !== undefined ? OPACITY_NORMAL : OPACITY_NODATA,
            },
          };
        }),
    };
  }, [geoJson, rateMap, cityCode]);

  const displayGeoJson = useMemo<GeoJSONCollection | null>(() => {
    if (!coloredGeoJson || !hoverInfo) return coloredGeoJson;
    return {
      ...coloredGeoJson,
      features: coloredGeoJson.features.map((f) =>
        f.properties.district_name === hoverInfo.districtName
          ? { ...f, properties: { ...f.properties, fill_opacity: OPACITY_HOVER } }
          : f
      ),
    };
  }, [coloredGeoJson, hoverInfo]);

  // 本土域のみでバウンドを計算してフィット（lat<35° の離島を除外）
  const fitToFeatures = useCallback((features: GeoJSONCollection['features']) => {
    if (!mapRef.current) return;
    const coords: [number, number][] = [];
    for (const f of features) {
      const geom = f.geometry as { type: string; coordinates: unknown };
      if (!geom) continue;
      const rings =
        geom.type === 'Polygon'
          ? (geom.coordinates as [number, number][][])
          : geom.type === 'MultiPolygon'
          ? (geom.coordinates as [number, number][][][]).flat()
          : [];
      for (const ring of rings) {
        for (const [lng, lat] of ring) {
          if (lat >= 35.0 && lat <= 37.5 && lng >= 138.4 && lng <= 141.0) {
            coords.push([lng, lat]);
          }
        }
      }
    }
    if (coords.length === 0) return;
    const minLng = coords.reduce((a, [lng]) => Math.min(a, lng), Infinity);
    const maxLng = coords.reduce((a, [lng]) => Math.max(a, lng), -Infinity);
    const minLat = coords.reduce((a, [, lat]) => Math.min(a, lat), Infinity);
    const maxLat = coords.reduce((a, [, lat]) => Math.max(a, lat), -Infinity);
    mapRef.current.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 40, duration: 600 }
    );
  }, []);

  // data が変わったとき（マップ初期化済みの場合）にフィット
  useEffect(() => {
    if (!coloredGeoJson) return;
    fitToFeatures(coloredGeoJson.features);
  }, [coloredGeoJson, fitToFeatures]);

  // マップ初期化完了後にフィット（GeoJSON が先に届いていた場合の対処）
  const handleMapLoad = useCallback(() => {
    if (coloredGeoJson) fitToFeatures(coloredGeoJson.features);
  }, [coloredGeoJson, fitToFeatures]);

  const handleMouseMove = useCallback(
    (event: { point: { x: number; y: number }; features?: MapGeoJSONFeature[] }) => {
      const f = event.features?.[0];
      if (f) {
        const props = f.properties as GeoJSONProperties;
        setHoverInfo({ x: event.point.x, y: event.point.y, districtName: props.district_name ?? '' });
      } else {
        setHoverInfo(null);
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => setHoverInfo(null), []);

  if (geoLoading) {
    return (
      <div className="shimmer" style={{ height: '420px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }} />
    );
  }

  return (
    <div style={{ position: 'relative', height: '420px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '32px' }}>
      <MapGL
        ref={(ref) => { if (ref) mapRef.current = ref.getMap() as unknown as MapLibreMap; }}
        initialViewState={INITIAL_VIEW}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['district-fill']}
        onLoad={handleMapLoad}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        cursor={hoverInfo ? 'pointer' : 'default'}
      >
        {displayGeoJson && (
          <Source id="districts" type="geojson" data={displayGeoJson}>
            <Layer id="district-fill" type="fill" paint={{ 'fill-color': ['get', 'fill_color'], 'fill-opacity': ['get', 'fill_opacity'] }} />
            <Layer id="district-outline" type="line" paint={{ 'line-color': ['get', 'fill_color'], 'line-width': 1, 'line-opacity': 0.7 }} />
          </Source>
        )}
      </MapGL>

      {hoverInfo && (() => {
        const data = rateMap.get(hoverInfo.districtName);
        return (
          <div style={{ position: 'absolute', left: hoverInfo.x + 12, top: hoverInfo.y - 12, background: 'rgba(6,13,31,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', minWidth: '160px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 10 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>{hoverInfo.districtName}</p>
            {data ? (
              <>
                <p className="num" style={{ fontSize: '20px', fontWeight: 700, color: getColor(data.changeRate), letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '6px' }}>
                  {formatRate(data.changeRate)}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                  平均&nbsp;<span className="num" style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    {data.avgPricePerSqm.toLocaleString()}円/㎡
                  </span>
                </p>
              </>
            ) : (
              <p style={{ fontSize: '12px', color: '#475569' }}>データなし</p>
            )}
          </div>
        );
      })()}

      <Legend />
    </div>
  );
}
